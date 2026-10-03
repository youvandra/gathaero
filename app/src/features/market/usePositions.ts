import { useAccount, useReadContract } from "wagmi";

import { env, isConfigured } from "../../config/env";
import { marketLensAbi } from "../../lib/abi";
import { DELAYED, ON_TIME, utcTime } from "./model";

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
  state: "open" | "won" | "lost" | "voided" | "settled";
  action: PositionAction;
};

const PROTECTION_KIND = 0;
const UNIT = 1e6;

function labelOf(raw: RawPosition): string {
  if (raw.kind === PROTECTION_KIND) return "Delay protection";
  return `Lands ${utcTime(raw.lowerBound)}–${utcTime(raw.upperBound)}`;
}

function sideName(raw: RawPosition, outcome: number): string {
  if (raw.kind === PROTECTION_KIND) return outcome === DELAYED ? "Delayed" : "On time";
  return outcome === ON_TIME ? "Yes" : "No";
}

function stateOf(raw: RawPosition, outcome: number): Position["state"] {
  if (raw.voided) return "voided";
  if (!raw.resolved) return "open";
  return raw.winning === outcome ? "won" : "lost";
}

function holdings(raw: RawPosition): Position[] {
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
        label: labelOf(raw),
        side: sideName(raw, side.outcome),
        shares: side.shares,
        mark,
        value: (Number(side.shares) / UNIT) * mark,
        state,
        action: state === "won" ? "redeem" : null,
      };
    });
}

function extras(raw: RawPosition): Position[] {
  const rows: Position[] = [];
  if (raw.voided && raw.contribution > 0n) {
    rows.push({
      key: `${raw.market}-refund`,
      market: raw.market,
      flight: raw.number,
      label: labelOf(raw),
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
      label: labelOf(raw),
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

export function usePositions() {
  const { address } = useAccount();
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
          ...(position.voided ? [] : holdings(position)),
          ...extras(position),
        ]),
    },
  });

  return { positions: query.data ?? [], isLoading: query.isLoading && Boolean(address) };
}
