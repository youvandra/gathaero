import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Address } from "viem";
import { useAccount, usePublicClient, useReadContract } from "wagmi";

import { targetChain } from "../../config/chains";
import { env, isConfigured } from "../../config/env";
import { flightMarketAbi, marketLensAbi } from "../../lib/abi";
import { DELAYED, ON_TIME, flightOfMarket, utcTime, type FlightMarket } from "./model";
import { useFlights } from "./useFlights";

type RawPosition = {
  market: `0x${string}`;
  number: string;
  kind: number;
  lowerBound: bigint;
  upperBound: bigint;
  onTimeBalance: bigint;
  delayedBalance: bigint;
  lpShares: bigint;
  lpValue: bigint;
  contribution: bigint;
  delayedProbability: bigint;
  resolved: boolean;
  voided: boolean;
  winning: number;
};

export type PositionAction = "redeem" | "refund" | "withdraw" | null;

export type Position = {
  key: string;
  market: `0x${string}`;
  flight: string;
  label: string;
  side: string;
  shares: bigint;
  mark: number;
  value: number;
  state: "open" | "won" | "lost" | "voided" | "settled" | "paid";
  action: PositionAction;
};

const PROTECTION_KIND = 0;
const UNIT = 1e6;

type Windows = Map<string, string>;

function labelOf(
  raw: { market: Address; kind: number; lowerBound: bigint; upperBound: bigint },
  windows: Windows,
) {
  if (raw.kind === PROTECTION_KIND) return "Delay protection";
  const window = windows.get(raw.market.toLowerCase());
  return `Lands ${window ?? `${utcTime(raw.lowerBound)}–${utcTime(raw.upperBound)}`}`;
}

const windowsOf = (flights: FlightMarket[]): Windows =>
  new Map(
    flights.flatMap((flight) =>
      flight.buckets.map((bucket) => [bucket.address.toLowerCase(), bucket.window] as const),
    ),
  );

function sideName(raw: RawPosition, outcome: number): string {
  if (raw.kind === PROTECTION_KIND) return outcome === DELAYED ? "Delayed" : "On time";
  return outcome === ON_TIME ? "Yes" : "No";
}

function stateOf(raw: RawPosition, outcome: number): Position["state"] {
  if (raw.voided) return "voided";
  if (!raw.resolved) return "open";
  return raw.winning === outcome ? "won" : "lost";
}

function holdings(raw: RawPosition, windows: Windows): Position[] {
  const delayed = Number(raw.delayedProbability) / 1e18;
  const sides = [
    { outcome: ON_TIME, shares: raw.onTimeBalance, price: 1 - delayed },
    { outcome: DELAYED, shares: raw.delayedBalance, price: delayed },
  ];

  return sides
    .filter((side) => side.shares > 0n)
    .map((side) => {
      const state = stateOf(raw, side.outcome);
      const mark = state === "won" ? 1 : state === "lost" ? 0 : side.price;
      return {
        key: `${raw.market}-${side.outcome}`,
        market: raw.market,
        flight: raw.number,
        label: labelOf(raw, windows),
        side: sideName(raw, side.outcome),
        shares: side.shares,
        mark,
        value: (Number(side.shares) / UNIT) * mark,
        state,
        action: state === "won" ? "redeem" : null,
      };
    });
}

function extras(raw: RawPosition, windows: Windows): Position[] {
  const rows: Position[] = [];
  if (raw.voided && raw.contribution > 0n) {
    rows.push({
      key: `${raw.market}-refund`,
      market: raw.market,
      flight: raw.number,
      label: labelOf(raw, windows),
      side: "Refund",
      shares: raw.contribution,
      mark: 1,
      value: Number(raw.contribution) / UNIT,
      state: "voided",
      action: "refund",
    });
  }
  if (raw.lpShares > 0n) {
    rows.push({
      key: `${raw.market}-lp`,
      market: raw.market,
      flight: raw.number,
      label: labelOf(raw, windows),
      side: "Liquidity",
      shares: raw.lpShares,
      mark: raw.lpShares > 0n ? Number(raw.lpValue) / Number(raw.lpShares) : 0,
      value: Number(raw.lpValue) / UNIT,
      state: raw.voided ? "voided" : raw.resolved ? "settled" : "open",
      action: raw.resolved || raw.voided ? "withdraw" : null,
    });
  }
  return rows;
}

/** Payouts already sent to this wallet, pushed by the resolver or claimed. */
function usePaidOut(address: Address | undefined, flights: FlightMarket[]) {
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const markets = useMemo(
    () =>
      flights.flatMap((flight) =>
        [flight.protection?.address, ...flight.buckets.map((bucket) => bucket.address)].filter(
          (market): market is Address => Boolean(market),
        ),
      ),
    [flights],
  );

  return useQuery({
    queryKey: ["paid", address, markets.length],
    enabled: isConfigured && Boolean(address && publicClient) && markets.length > 0,
    refetchInterval: 20_000,
    queryFn: async (): Promise<Position[]> => {
      if (!publicClient || !address) return [];
      const logs = await publicClient.getContractEvents({
        address: markets,
        abi: flightMarketAbi,
        eventName: "Redeemed",
        args: { holder: address },
        fromBlock: env.deployBlock,
      });
      return logs.map((log) => {
        const flight = flightOfMarket(flights, log.address);
        const bucket = flight?.buckets.find(
          (b) => b.address.toLowerCase() === log.address.toLowerCase(),
        );
        const amount = log.args.amountOut ?? 0n;
        return {
          key: `${log.transactionHash}-${log.logIndex}`,
          market: log.address,
          flight: flight?.code ?? "",
          label: bucket ? `Lands ${bucket.window}` : "Delay protection",
          side: "Paid to wallet",
          shares: amount,
          mark: 1,
          value: Number(amount) / UNIT,
          state: "paid",
          action: null,
        };
      });
    },
  });
}

export function usePositions() {
  const { address } = useAccount();
  const { flights } = useFlights();
  const windows = useMemo(() => windowsOf(flights), [flights]);
  const paid = usePaidOut(address, flights);
  const query = useReadContract({
    address: env.contracts.marketLens,
    abi: marketLensAbi,
    functionName: "positionsOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConfigured && Boolean(address),
      refetchInterval: 10_000,
      select: (raw) =>
        raw.flatMap((position) => [
          ...(position.voided ? [] : holdings(position, windows)),
          ...extras(position, windows),
        ]),
    },
  });

  return {
    positions: [...(query.data ?? []), ...(paid.data ?? [])],
    isLoading: query.isLoading && Boolean(address),
    error: query.error,
    refetch: () => {
      void query.refetch();
      void paid.refetch();
    },
  };
}
