import { maxUint256, parseUnits, zeroAddress, type Address, type Hex } from "viem";

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

const MIN_LEAD_SECONDS = 30 * 60;
const PROTECTION_LIQUIDITY = parseUnits("2000", 6);
const RANGE_LIQUIDITY = parseUnits("500", 6);

async function topUp(clients: Clients, config: FeederConfig, needed: bigint): Promise<void> {
  const balance = await clients.publicClient.readContract({
    address: config.contracts.collateral,
    abi: mockERC20Abi,
    functionName: "balanceOf",
    args: [clients.account.address],
  });
  if (balance >= needed) return;
  await confirm(
    clients,
    clients.walletClient.writeContract({
      address: config.contracts.collateral,
      abi: mockERC20Abi,
      functionName: "mint",
      args: [clients.account.address, needed - balance],
    }),
  );
}

async function seedMarket(
  clients: Clients,
  config: FeederConfig,
  market: Address,
  liquidity: bigint,
  delayedProbability: number,
): Promise<void> {
  const seeded = await clients.publicClient.readContract({
    address: market,
    abi: flightMarketAbi,
    functionName: "totalShares",
  });
  if (seeded > 0n) return;

  const trade = seedTradeFor(liquidity, delayedProbability);
  await topUp(clients, config, liquidity + (trade?.amount ?? 0n));
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

  if (!trade || trade.amount === 0n) return;
  await confirm(
    clients,
    clients.walletClient.writeContract({
      address: market,
      abi: flightMarketAbi,
      functionName: "buy",
      args: [trade.outcome, trade.amount, 0n],
    }),
  );
}

async function ensureProtection(clients: Clients, config: FeederConfig, flightId: Hex) {
  const existing = await clients.publicClient.readContract({
    address: config.contracts.factory,
    abi: marketFactoryAbi,
    functionName: "marketOf",
    args: [flightId],
  });
  if (existing !== zeroAddress) return existing;

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

async function ensureRange(
  clients: Clients,
  config: FeederConfig,
  flightId: Hex,
  lower: bigint,
  upper: bigint,
) {
  const existing = await clients.publicClient.readContract({
    address: config.contracts.factory,
    abi: marketFactoryAbi,
    functionName: "rangeMarketOf",
    args: [flightId, lower, upper],
  });
  if (existing !== zeroAddress) return existing;

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
    const live = await fetchFlight(listing.number, listing.date, config.rapidApi, listing.route);
    return { route: live.route ?? listing.route, scheduledArrival: live.scheduledArrival };
  } catch (error) {
    console.warn(`  schedule lookup failed, using flights.json: ${(error as Error).message}`);
    return fallback;
  }
}

async function registerOnce(
  clients: Clients,
  config: FeederConfig,
  flightId: Hex,
  listing: Listing,
): Promise<{ route: string; scheduledArrival: number }> {
  const exists = await clients.publicClient.readContract({
    address: config.contracts.registry,
    abi: flightRegistryAbi,
    functionName: "exists",
    args: [flightId],
  });
  if (exists) {
    const flight = await clients.publicClient.readContract({
      address: config.contracts.registry,
      abi: flightRegistryAbi,
      functionName: "getFlight",
      args: [flightId],
    });
    return { route: flight.route, scheduledArrival: Number(flight.scheduledArrival) };
  }

  const schedule = await resolveSchedule(config, listing);
  await confirm(
    clients,
    clients.walletClient.writeContract({
      address: config.contracts.registry,
      abi: flightRegistryAbi,
      functionName: "registerFlight",
      args: [
        flightId,
        listing.number,
        schedule.route,
        BigInt(schedule.scheduledArrival),
        listing.delayThresholdMinutes,
      ],
    }),
  );
  return schedule;
}

async function list(clients: Clients, config: FeederConfig, listing: Listing): Promise<void> {
  const flightId = flightIdOf(listing.number, listing.date);
  const schedule = await registerOnce(clients, config, flightId, listing);
  const arrival = new Date(schedule.scheduledArrival * 1000).toISOString();

  if (schedule.scheduledArrival <= Math.floor(Date.now() / 1000) + MIN_LEAD_SECONDS) {
    console.log(`${listing.number} ${listing.date} arrives ${arrival}, too late to trade, skipped`);
    return;
  }
  console.log(`${listing.number} ${listing.date} ${schedule.route} arr ${arrival}`);

  const protection = await ensureProtection(clients, config, flightId);
  await seedMarket(clients, config, protection, PROTECTION_LIQUIDITY, listing.delayProbability);
  console.log(`  protection ${protection}`);

  for (const bucket of listing.buckets ?? DEFAULT_BUCKETS) {
    const lower = BigInt(schedule.scheduledArrival + bucket.fromMinutes * 60);
    const upper = BigInt(schedule.scheduledArrival + bucket.toMinutes * 60);
    const range = await ensureRange(clients, config, flightId, lower, upper);
    await seedMarket(clients, config, range, RANGE_LIQUIDITY, 1 - bucket.yes);
    console.log(`  range ${bucket.fromMinutes}..${bucket.toMinutes} ${range}`);
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const clients = clientsFor(config);
  const listings = flights as Listing[];

  for (const listing of listings) {
    await list(clients, config, listing);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
