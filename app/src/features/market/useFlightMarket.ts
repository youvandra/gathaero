import { keccak256, toBytes, zeroAddress, type Address } from "viem";
import { useReadContract, useWriteContract } from "wagmi";

import { env } from "../../config/env";
import { flightMarketAbi, marketFactoryAbi } from "../../lib/abi";

export const DELAYED_OUTCOME = 1;
export const DEFAULT_FLIGHT = { number: "SQ956", date: "2026-10-01" } as const;

export const isConfigured = env.contracts.marketFactory !== zeroAddress;

export function flightIdOf(number: string, date: string): `0x${string}` {
  const normalized = number.replace(/\s+/g, "").toUpperCase();
  return keccak256(toBytes(`${normalized}-${date}`));
}

export function useMarketAddress(flightId: `0x${string}`): Address | undefined {
  const { data } = useReadContract({
    address: env.contracts.marketFactory,
    abi: marketFactoryAbi,
    functionName: "marketOf",
    args: [flightId],
    query: { enabled: isConfigured },
  });

  const market = data as Address | undefined;
  return market && market !== zeroAddress ? market : undefined;
}

export function useMarketState(market?: Address) {
  const enabled = Boolean(market);

  const reserves = useReadContract({
    address: market,
    abi: flightMarketAbi,
    functionName: "reserves",
    query: { enabled },
  });

  const probability = useReadContract({
    address: market,
    abi: flightMarketAbi,
    functionName: "probability",
    args: [DELAYED_OUTCOME],
    query: { enabled },
  });

  const resolved = useReadContract({
    address: market,
    abi: flightMarketAbi,
    functionName: "resolved",
    query: { enabled },
  });

  return {
    reserves: reserves.data as readonly [bigint, bigint] | undefined,
    probability: probability.data as bigint | undefined,
    resolved: resolved.data as boolean | undefined,
    isLoading: reserves.isLoading || probability.isLoading,
  };
}

export function useBuyProtection(market?: Address) {
  const { writeContractAsync, isPending } = useWriteContract();

  const buy = (collateral: bigint) => {
    if (!market) throw new Error("Market not configured");
    return writeContractAsync({
      address: market,
      abi: flightMarketAbi,
      functionName: "buy",
      args: [DELAYED_OUTCOME, collateral],
    });
  };

  return { buy, isPending };
}

export function useAddLiquidity(market?: Address) {
  const { writeContractAsync, isPending } = useWriteContract();

  const addLiquidity = (amount: bigint) => {
    if (!market) throw new Error("Market not configured");
    return writeContractAsync({
      address: market,
      abi: flightMarketAbi,
      functionName: "addLiquidity",
      args: [amount],
    });
  };

  return { addLiquidity, isPending };
}
