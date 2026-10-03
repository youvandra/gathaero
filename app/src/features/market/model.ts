import type { Address } from "viem";

import { ZERO_ADDRESS } from "../../config/env";

export const ON_TIME = 0;
export const DELAYED = 1;

export type MarketStatus = "open" | "in flight" | "awaiting" | "delayed" | "on time" | "voided";

export type MarketSnapshot = {
  address: Address;
  reserveOnTime: bigint;
  reserveDelayed: bigint;
  delayedProbability: number;
  volume: bigint;
  locked: bigint;
  resolved: boolean;
  voided: boolean;
  delayedWon: boolean;
};

export type Bucket = MarketSnapshot & {
  from: string;
  to: string;
  yes: number;
  hit: boolean;
};

export type FlightMarket = {
  id: `0x${string}`;
  code: string;
  route: string;
  date: string;
  scheduledDeparture: string;
  departureTimestamp: number;
  scheduledArrival: string;
  arrivalTimestamp: number;
  thresholdMinutes: number;
  delayMinutes: number | null;
  status: MarketStatus;
  delayProbability: number;
  volume: bigint;
  openInterest: bigint;
  protection: MarketSnapshot | null;
  buckets: Bucket[];
};

type RawMarket = {
  market: Address;
  reserveOnTime: bigint;
  reserveDelayed: bigint;
  lowerBound: bigint;
  upperBound: bigint;
  delayedProbability: bigint;
  volume: bigint;
  locked: bigint;
  resolved: boolean;
  voided: boolean;
  winning: number;
};

export type RawFlight = {
  flightId: `0x${string}`;
  number: string;
  route: string;
  scheduledDeparture: bigint;
  scheduledArrival: bigint;
  delayThresholdMinutes: number;
  delayMinutes: number;
  finalized: boolean;
  protection: RawMarket;
  ranges: readonly RawMarket[];
};

const WAD = 1e18;

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const utcTime = (seconds: bigint | number): string =>
  timeFormat.format(new Date(Number(seconds) * 1000));

export const utcDate = (seconds: bigint | number): string =>
  dateFormat.format(new Date(Number(seconds) * 1000));

export const formatRoute = (route: string): string => route.replace("-", " → ");

function snapshotOf(raw: RawMarket): MarketSnapshot {
  return {
    address: raw.market,
    reserveOnTime: raw.reserveOnTime,
    reserveDelayed: raw.reserveDelayed,
    delayedProbability: Number(raw.delayedProbability) / WAD,
    volume: raw.volume,
    locked: raw.locked,
    resolved: raw.resolved,
    voided: raw.voided,
    delayedWon: raw.resolved && raw.winning === DELAYED,
  };
}

function statusOf(flight: RawFlight, protection: MarketSnapshot | null): MarketStatus {
  if (protection?.voided) return "voided";
  if (protection?.resolved) return protection.delayedWon ? "delayed" : "on time";
  const now = Date.now() / 1000;
  if (now > Number(flight.scheduledArrival)) return "awaiting";
  if (now >= Number(flight.scheduledDeparture)) return "in flight";
  return "open";
}

export function toFlightMarket(flight: RawFlight): FlightMarket {
  const protection =
    flight.protection.market === ZERO_ADDRESS ? null : snapshotOf(flight.protection);

  const buckets: Bucket[] = flight.ranges.map((range) => {
    const snapshot = snapshotOf(range);
    return {
      ...snapshot,
      from: utcTime(range.lowerBound),
      to: utcTime(range.upperBound),
      yes: 1 - snapshot.delayedProbability,
      hit: snapshot.resolved && !snapshot.delayedWon,
    };
  });

  const markets = [protection, ...buckets].filter((m): m is MarketSnapshot => m !== null);

  return {
    id: flight.flightId,
    code: flight.number,
    route: formatRoute(flight.route),
    date: utcDate(flight.scheduledDeparture),
    scheduledDeparture: utcTime(flight.scheduledDeparture),
    departureTimestamp: Number(flight.scheduledDeparture),
    scheduledArrival: utcTime(flight.scheduledArrival),
    arrivalTimestamp: Number(flight.scheduledArrival),
    thresholdMinutes: flight.delayThresholdMinutes,
    delayMinutes: flight.finalized ? flight.delayMinutes : null,
    status: statusOf(flight, protection),
    delayProbability: protection?.delayedProbability ?? 0,
    volume: markets.reduce((sum, m) => sum + m.volume, 0n),
    openInterest: markets.reduce((sum, m) => sum + m.locked, 0n),
    protection,
    buckets,
  };
}

export const isLive = (market: FlightMarket): boolean =>
  market.status === "open" || market.status === "in flight" || market.status === "awaiting";

export function quoteShares(market: MarketSnapshot, outcome: number, amount: bigint): bigint {
  const [want, unwanted] =
    outcome === DELAYED
      ? [market.reserveDelayed, market.reserveOnTime]
      : [market.reserveOnTime, market.reserveDelayed];
  if (amount <= 0n || want === 0n) return 0n;
  return amount + (want * amount) / (unwanted + amount);
}

/** Most one wallet can put into one market, in 6-decimal USDG. Mirrors FlightMarket.MAX_STAKE. */
export const MAX_STAKE = 200_000_000n;

/** Gate arrival reported by the oracle, as "HH:MM", once the flight has settled. */
export function actualArrival(market: FlightMarket): string | null {
  if (market.delayMinutes === null) return null;
  return utcTime(market.arrivalTimestamp + market.delayMinutes * 60);
}

/** The flight a market contract belongs to, from either its protection pool or a window. */
export function flightOfMarket(
  flights: FlightMarket[],
  market: string,
): FlightMarket | undefined {
  const target = market.toLowerCase();
  return flights.find(
    (flight) =>
      flight.protection?.address.toLowerCase() === target ||
      flight.buckets.some((bucket) => bucket.address.toLowerCase() === target),
  );
}

export function delayLine(minutes: number): string {
  if (minutes === 0) return "On schedule";
  return minutes > 0 ? `${minutes} min late` : `${Math.abs(minutes)} min early`;
}
