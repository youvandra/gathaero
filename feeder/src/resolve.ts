import type { Address, Hex } from "viem";

import { flightMarketAbi, marketLensAbi, mockFeederAbi } from "./abi.js";
import { fetchFlight } from "./aerodatabox.js";
import { clientsFor, type Clients } from "./chain.js";
import { loadConfig, type FeederConfig } from "./config.js";
import { confirm, flightIdOf } from "./tx.js";

type Verdict = { kind: "landed"; delayMinutes: number } | { kind: "void" } | { kind: "pending" };

type ManualVerdict = { flightId: Hex; verdict: Verdict };

const WATCH_INTERVAL_MS = 5 * 60_000;

async function readFlights(clients: Clients, config: FeederConfig) {
  return clients.publicClient.readContract({
    address: config.contracts.lens,
    abi: marketLensAbi,
    functionName: "flights",
  });
}

type FlightView = Awaited<ReturnType<typeof readFlights>>[number];

const openMarketsOf = (flight: FlightView): Address[] =>
  [flight.protection, ...flight.ranges]
    .filter((market) => market.market !== "0x0000000000000000000000000000000000000000")
    .filter((market) => !market.resolved && !market.voided)
    .map((market) => market.market);

async function lookUp(config: FeederConfig, flight: FlightView, date: string): Promise<Verdict> {
  if (!config.rapidApi) return { kind: "pending" };
  const snapshot = await fetchFlight(flight.number, date, config.rapidApi);
  console.log(`  ${flight.number} status ${snapshot.status}, delay ${snapshot.delayMinutes} min`);
  if (snapshot.outcome === "landed") return { kind: "landed", delayMinutes: snapshot.delayMinutes };
  return { kind: snapshot.outcome };
}

const localDateOf = (flight: FlightView, candidates: string[]): string | undefined =>
  candidates.find((date) => flightIdOf(flight.number, date) === flight.flightId);

function candidateDates(scheduledArrival: bigint): string[] {
  const base = Number(scheduledArrival) * 1000;
  return [-1, 0, 1].map((offset) => new Date(base + offset * 86_400_000).toISOString().slice(0, 10));
}

async function settle(clients: Clients, config: FeederConfig, flight: FlightView, verdict: Verdict) {
  const open = openMarketsOf(flight);

  if (verdict.kind === "void") {
    for (const market of open) {
      await confirm(clients, clients.walletClient.writeContract({ address: market, abi: flightMarketAbi, functionName: "resolveVoid" }));
    }
    console.log(`  voided ${open.length} markets`);
    return;
  }

  if (verdict.kind === "landed" && !flight.finalized) {
    await confirm(
      clients,
      clients.walletClient.writeContract({
        address: config.contracts.feeder,
        abi: mockFeederAbi,
        functionName: "feed",
        args: [flight.flightId, verdict.delayMinutes, true],
      }),
    );
  }

  if (verdict.kind === "landed" || flight.finalized) {
    for (const market of open) {
      await confirm(clients, clients.walletClient.writeContract({ address: market, abi: flightMarketAbi, functionName: "resolve" }));
    }
    console.log(`  resolved ${open.length} markets`);
  }
}

async function sweep(clients: Clients, config: FeederConfig, manual: ManualVerdict | null) {
  const now = Math.floor(Date.now() / 1000);

  for (const flight of await readFlights(clients, config)) {
    if (openMarketsOf(flight).length === 0) continue;

    if (manual) {
      if (manual.flightId === flight.flightId) await settle(clients, config, flight, manual.verdict);
      continue;
    }

    if (flight.finalized) {
      await settle(clients, config, flight, { kind: "pending" });
      continue;
    }

    const due = Number(flight.scheduledArrival) + config.landedGraceMinutes * 60;
    if (now < due) continue;

    const date = localDateOf(flight, candidateDates(flight.scheduledArrival));
    if (!date) {
      console.warn(`  ${flight.number}: cannot recover listing date`);
      continue;
    }

    try {
      await settle(clients, config, flight, await lookUp(config, flight, date));
    } catch (error) {
      console.warn(`  ${flight.number}: ${(error as Error).message}`);
    }
  }
}

function parseManual(args: string[]): ManualVerdict | null {
  const [number, date, value] = args.filter((arg) => !arg.startsWith("--"));
  if (!number || !date || !value) return null;
  const verdict: Verdict =
    value === "void" ? { kind: "void" } : { kind: "landed", delayMinutes: Number(value) };
  if (verdict.kind === "landed" && !Number.isInteger(verdict.delayMinutes)) {
    throw new Error("Delay must be whole minutes or 'void'");
  }
  return { flightId: flightIdOf(number, date), verdict };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = loadConfig();
  const clients = clientsFor(config);
  const manual = parseManual(args);

  await sweep(clients, config, manual);
  if (!args.includes("--watch") || manual) return;

  setInterval(() => {
    sweep(clients, config, null).catch((error: unknown) => console.error(error));
  }, WATCH_INTERVAL_MS);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
