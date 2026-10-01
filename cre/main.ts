import { cre } from "@chainlink/cre-sdk";
import { encodeAbiParameters, keccak256, toBytes, type Hex } from "viem";

import workflowConfig from "./config.json" with { type: "json" };

const MOVEMENT_SCHEMA = "AeroDataBox flight movement";
const RAPIDAPI_SECRET_ID = "RAPIDAPI_KEY";
const SCHEDULE = "*/30 * * * *";
const GAS_LIMIT = "200000";

type WorkflowConfig = {
  flightNumber: string;
  flightDate: string;
  aerodataboxHost: string;
  chainSelector: string;
  receiverAddress: string;
};

type Movement = {
  scheduledTime: { utc: string };
  revisedTime?: { utc: string };
  runwayTime?: { utc: string };
};

type Flight = {
  status: string;
  departure: Movement;
  arrival: Movement;
};

const config = workflowConfig as WorkflowConfig;

function flightIdOf(flightNumber: string, dateLocal: string): Hex {
  const normalized = flightNumber.replace(/\s+/g, "").toUpperCase();
  return keccak256(toBytes(`${normalized}-${dateLocal}`));
}

function delayMinutesOf(flight: Flight): number {
  const scheduled = Date.parse(flight.arrival.scheduledTime.utc);
  const actual = Date.parse(
    flight.arrival.runwayTime?.utc ?? flight.arrival.revisedTime?.utc ?? flight.arrival.scheduledTime.utc,
  );
  return Math.round((actual - scheduled) / 60_000);
}

function firstFlight(payload: unknown): Flight {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error(`${MOVEMENT_SCHEMA}: empty response`);
  }
  return payload[0] as Flight;
}

export async function main() {
  const trigger = cre.capabilities.cron.trigger({ schedule: SCHEDULE });

  cre.handler(trigger, async (runtime) => {
    const apiKey = await runtime.getSecret({ id: RAPIDAPI_SECRET_ID }).result();
    const url = `https://${config.aerodataboxHost}/flights/number/${config.flightNumber}/${config.flightDate}`;

    const response = await runtime.http
      .sendRequest({
        url,
        method: "GET",
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": config.aerodataboxHost,
        },
      })
      .result();

    const delayMinutes = delayMinutesOf(firstFlight(response.json()));
    const flightId = flightIdOf(config.flightNumber, config.flightDate);

    const payload = encodeAbiParameters(
      [{ type: "bytes32" }, { type: "int32" }, { type: "bool" }],
      [flightId, delayMinutes, true],
    );

    const report = await runtime.report(payload).result();
    const evm = new cre.evm.EVMClient(config.chainSelector);
    await evm
      .writeReport({
        receiver: config.receiverAddress as Hex,
        report,
        gasLimit: GAS_LIMIT,
      })
      .result();
  });

  return cre.workflow();
}
