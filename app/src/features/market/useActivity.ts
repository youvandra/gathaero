import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";

import { targetChain } from "../../config/chains";
import { env, isConfigured } from "../../config/env";
import { flightMarketAbi } from "../../lib/abi";

export type Trade = {
  market: Address;
  amount: number;
  delayedProbability: number;
  block: bigint;
};

const UNIT = 1e6;

export function useTrades(markets: Address[]) {
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const key = [...markets].sort().join(",");

  return useQuery({
    queryKey: ["trades", key],
    enabled: isConfigured && markets.length > 0 && Boolean(publicClient),
    refetchInterval: 20_000,
    queryFn: async (): Promise<Trade[]> => {
      if (!publicClient) return [];
      const logs = await publicClient.getContractEvents({
        address: markets,
        abi: flightMarketAbi,
        eventName: "Bought",
        fromBlock: env.deployBlock,
      });
      return logs.map((log) => ({
        market: log.address,
        amount: Number(log.args.collateralIn ?? 0n) / UNIT,
        delayedProbability: Number(log.args.delayedProbability ?? 0n) / 1e18,
        block: log.blockNumber,
      }));
    },
  });
}

export function probabilitySeries(trades: Trade[], market: Address, current: number): number[] {
  const points = trades
    .filter((trade) => trade.market.toLowerCase() === market.toLowerCase())
    .map((trade) => trade.delayedProbability);
  return points.length > 0 ? [...points, current] : [current, current];
}

export function cumulativeVolume(trades: Trade[]): number[] {
  let total = 0;
  const series = trades.map((trade) => (total += trade.amount));
  return series.length > 1 ? series : [0, total];
}
