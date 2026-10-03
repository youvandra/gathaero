import type { Address } from "viem";

import { ZERO_ADDRESS } from "../../config/env";

export const ON_TIME = 0;
export const DELAYED = 1;

export type MarketStatus = "open" | "awaiting" | "delayed" | "on time" | "voided";

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
  if (Date.now() / 1000 > Number(flight.scheduledArrival)) return "awaiting";
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
    date: utcDate(flight.scheduledArrival),
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
  market.status === "open" || market.status === "awaiting";

export function quoteShares(market: MarketSnapshot, outcome: number, amount: bigint): bigint {
  const [want, unwanted] =
    outcome === DELAYED
      ? [market.reserveDelayed, market.reserveOnTime]
      : [market.reserveOnTime, market.reserveDelayed];
  if (amount <= 0n || want === 0n) return 0n;
  return amount + (want * amount) / (unwanted + amount);
}
