import { maxUint256, parseUnits, type Address, type Hex } from "viem";

import { flightMarketAbi, flightRegistryAbi, marketFactoryAbi, mockERC20Abi } from "./abi.js";
import { fetchFlight } from "./aerodatabox.js";
import { clientsFor, type Clients } from "./chain.js";
import { loadConfig, type FeederConfig } from "./config.js";
import flights from "./flights.json" with { type: "json" };
import { seedTradeFor } from "./odds.js";
import { confirm, flightIdOf } from "./tx.js";

type Bucket = { fromMinutes: number; toMinutes: number; yes: number };

type Listing = {
  number: string;
  date: string;
  route: string;
  scheduledArrival: string;
  delayThresholdMinutes: number;
  delayProbability: number;
  buckets?: Bucket[];
};

const DEFAULT_BUCKETS: Bucket[] = [
  { fromMinutes: -20, toMinutes: -5, yes: 0.22 },
  { fromMinutes: -5, toMinutes: 10, yes: 0.45 },
  { fromMinutes: 10, toMinutes: 30, yes: 0.2 },
  { fromMinutes: 30, toMinutes: 60, yes: 0.08 },
];

const PROTECTION_LIQUIDITY = parseUnits("2000", 6);
const RANGE_LIQUIDITY = parseUnits("500", 6);

async function seedMarket(
  clients: Clients,
  config: FeederConfig,
  market: Address,
  liquidity: bigint,
  delayedProbability: number,
): Promise<void> {
  await confirm(
    clients,
    clients.walletClient.writeContract({
    address: config.contracts.collateral,
    abi: mockERC20Abi,
    functionName: "approve",
    args: [market, maxUint256],
  }),
  );
  await confirm(
    clients,
    clients.walletClient.writeContract({
    address: market,
    abi: flightMarketAbi,
    functionName: "addLiquidity",
    args: [liquidity],
  }),
  );

  const trade = seedTradeFor(liquidity, delayedProbability);
  if (!trade || trade.amount === 0n) return;
  await confirm(
    clients,
    clients.walletClient.writeContract({
    address: market,
    abi: flightMarketAbi,
    functionName: "buy",
    args: [trade.outcome, trade.amount],
  }),
  );
}

async function createProtection(clients: Clients, config: FeederConfig, flightId: Hex) {
  const { request, result } = await clients.publicClient.simulateContract({
    account: clients.account,
    address: config.contracts.factory,
    abi: marketFactoryAbi,
    functionName: "createProtection",
    args: [flightId],
  });
  await confirm(clients, clients.walletClient.writeContract(request));
  return result;
}

async function createRange(
  clients: Clients,
  config: FeederConfig,
  flightId: Hex,
  lower: bigint,
  upper: bigint,
) {
  const { request, result } = await clients.publicClient.simulateContract({
    account: clients.account,
    address: config.contracts.factory,
    abi: marketFactoryAbi,
    functionName: "createRange",
    args: [flightId, lower, upper],
  });
  await confirm(clients, clients.walletClient.writeContract(request));
  return result;
}

async function resolveSchedule(config: FeederConfig, listing: Listing) {
  const fallback = {
    route: listing.route,
    scheduledArrival: Math.floor(Date.parse(listing.scheduledArrival) / 1000),
  };
  if (!config.rapidApi) return fallback;

  try {
    const live = await fetchFlight(listing.number, listing.date, config.rapidApi);
    return { route: live.route ?? listing.route, scheduledArrival: live.scheduledArrival };
  } catch (error) {
    console.warn(`  schedule lookup failed, using flights.json: ${(error as Error).message}`);
    return fallback;
  }
}

async function list(clients: Clients, config: FeederConfig, listing: Listing): Promise<void> {
  const flightId = flightIdOf(listing.number, listing.date);
  const exists = await clients.publicClient.readContract({
    address: config.contracts.registry,
    abi: flightRegistryAbi,
    functionName: "exists",
    args: [flightId],
  });
  if (exists) {
    console.log(`${listing.number} ${listing.date} already listed`);
    return;
  }

  const schedule = await resolveSchedule(config, listing);
  console.log(`${listing.number} ${listing.date} ${schedule.route} arr ${new Date(schedule.scheduledArrival * 1000).toISOString()}`);

  await confirm(
    clients,
    clients.walletClient.writeContract({
    address: config.contracts.registry,
    abi: flightRegistryAbi,
    functionName: "registerFlight",
    args: [flightId, listing.number, schedule.route, BigInt(schedule.scheduledArrival), listing.delayThresholdMinutes],
  }),
  );

  const protection = await createProtection(clients, config, flightId);
  await seedMarket(clients, config, protection, PROTECTION_LIQUIDITY, listing.delayProbability);
  console.log(`  protection ${protection}`);

  for (const bucket of listing.buckets ?? DEFAULT_BUCKETS) {
    const lower = BigInt(schedule.scheduledArrival + bucket.fromMinutes * 60);
    const upper = BigInt(schedule.scheduledArrival + bucket.toMinutes * 60);
    const range = await createRange(clients, config, flightId, lower, upper);
    await seedMarket(clients, config, range, RANGE_LIQUIDITY, 1 - bucket.yes);
    console.log(`  range ${bucket.fromMinutes}..${bucket.toMinutes} ${range}`);
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const clients = clientsFor(config);
  const listings = flights as Listing[];

  const budget = parseUnits("10000", 6) * BigInt(listings.length);
  await confirm(
    clients,
    clients.walletClient.writeContract({
    address: config.contracts.collateral,
    abi: mockERC20Abi,
    functionName: "mint",
    args: [clients.account.address, budget],
  }),
  );

  for (const listing of listings) {
    await list(clients, config, listing);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
