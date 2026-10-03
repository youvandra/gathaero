import {
  consensusIdenticalAggregation,
  cre,
  getNetwork,
  json,
  ok,
  prepareReportRequest,
  Runner,
  type HTTPSendRequester,
  type Runtime,
} from "@chainlink/cre-sdk";
import { encodeAbiParameters, keccak256, toBytes, type Hex } from "viem";

type FlightRef = { number: string; date: string };

type Config = {
  schedule: string;
  aerodataboxHost: string;
  chainSelectorName: string;
  receiverAddress: Hex;
  gasLimit: string;
  flights: FlightRef[];
};

type Movement = {
  scheduledTime?: { utc: string };
  revisedTime?: { utc: string };
  runwayTime?: { utc: string };
};

type AeroDataBoxFlight = { status: string; arrival: Movement };

type Landing = { arrived: boolean; delayMinutes: number };

const RAPIDAPI_SECRET_ID = "RAPIDAPI_KEY";

const parseUtc = (value: string): number => Date.parse(value.replace(" ", "T"));

function flightIdOf({ number, date }: FlightRef): Hex {
  return keccak256(toBytes(`${number.replace(/\s+/g, "").toUpperCase()}-${date}`));
}

function landingOf(payload: unknown): Landing {
  const flight = Array.isArray(payload) ? (payload[0] as AeroDataBoxFlight | undefined) : undefined;
  const scheduled = flight?.arrival.scheduledTime?.utc;
  if (!flight || !scheduled || flight.status !== "Arrived") {
    return { arrived: false, delayMinutes: 0 };
  }
  // Gate arrival first (airline on-time standard), touchdown as fallback.
  const actual = flight.arrival.revisedTime?.utc ?? flight.arrival.runwayTime?.utc;
  if (!actual) return { arrived: false, delayMinutes: 0 };
  return {
    arrived: true,
    delayMinutes: Math.round((parseUtc(actual) - parseUtc(scheduled)) / 60_000),
  };
}

const fetchLanding =
  (config: Config, flight: FlightRef, apiKey: string) =>
  (requester: HTTPSendRequester): Landing => {
    const response = requester
      .sendRequest({
        url: `https://${config.aerodataboxHost}/flights/number/${flight.number}/${flight.date}`,
        method: "GET",
        headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": config.aerodataboxHost },
      })
      .result();
    if (!ok(response)) return { arrived: false, delayMinutes: 0 };
    return landingOf(json(response));
  };

function report(
  runtime: Runtime<Config>,
  evm: InstanceType<typeof cre.capabilities.EVMClient>,
  flight: FlightRef,
  delayMinutes: number,
) {
  const payload = encodeAbiParameters(
    [{ type: "bytes32" }, { type: "int32" }, { type: "bool" }],
    [flightIdOf(flight), delayMinutes, true],
  );
  const signed = runtime.report(prepareReportRequest(payload)).result();
  evm
    .writeReport(runtime, {
      receiver: runtime.config.receiverAddress,
      report: signed,
      gasConfig: { gasLimit: runtime.config.gasLimit },
    })
    .result();
}

const onCron = (runtime: Runtime<Config>): string => {
  const config = runtime.config;
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: config.chainSelectorName,
    isTestnet: true,
  });
  if (!network) throw new Error(`Unknown network ${config.chainSelectorName}`);

  const apiKey = runtime.getSecret({ id: RAPIDAPI_SECRET_ID }).result().value;
  const http = new cre.capabilities.HTTPClient();
  const evm = new cre.capabilities.EVMClient(network.chainSelector.selector);

  const settled: string[] = [];
  for (const flight of config.flights) {
    const landing = http
      .sendRequest(
        runtime,
        fetchLanding(config, flight, apiKey),
        consensusIdenticalAggregation<Landing>(),
      )()
      .result();
    if (!landing.arrived) continue;
    report(runtime, evm, flight, landing.delayMinutes);
    settled.push(`${flight.number} ${landing.delayMinutes}m`);
  }
  return settled.length > 0 ? `reported ${settled.join(", ")}` : "nothing landed";
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();
  return [cre.handler(cron.trigger({ schedule: config.schedule }), onCron)];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}

main();
