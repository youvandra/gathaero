import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Address, Hash } from "viem";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";

import { targetChain } from "../../config/chains";
import { env } from "../../config/env";
import { collateralAbi, flightMarketAbi } from "../../lib/abi";

export const FAUCET_AMOUNT = 1_000_000_000n;

export function useTransact() {
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [pending, setPending] = useState(false);

  const settle = async (hash: Hash) => {
    if (!publicClient) throw new Error("No RPC client");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted");
  };

  const ensureChain = async () => {
    if (chainId !== targetChain.id) await switchChainAsync({ chainId: targetChain.id });
  };

  const ensureAllowance = async (spender: Address, amount: bigint) => {
    if (!publicClient || !address) throw new Error("Connect a wallet first");
    const allowance = await publicClient.readContract({
      address: env.contracts.collateral,
      abi: collateralAbi,
      functionName: "allowance",
      args: [address, spender],
    });
    if (allowance >= amount) return;
    await settle(
      await writeContractAsync({
        address: env.contracts.collateral,
        abi: collateralAbi,
        functionName: "approve",
        args: [spender, amount],
      }),
    );
  };

  const run = async (steps: () => Promise<Hash>) => {
    if (!address) throw new Error("Connect a wallet first");
    setPending(true);
    try {
      await ensureChain();
      await settle(await steps());
      await queryClient.invalidateQueries();
    } finally {
      setPending(false);
    }
  };

  const write = (market: Address, functionName: "redeem" | "refund") =>
    run(() => writeContractAsync({ address: market, abi: flightMarketAbi, functionName }));

  return {
    pending,
    buy: (market: Address, outcome: number, amount: bigint, minShares: bigint) =>
      run(async () => {
        await ensureAllowance(market, amount);
        return writeContractAsync({
          address: market,
          abi: flightMarketAbi,
          functionName: "buy",
          args: [outcome, amount, minShares],
        });
      }),
    addLiquidity: (market: Address, amount: bigint) =>
      run(async () => {
        await ensureAllowance(market, amount);
        return writeContractAsync({
          address: market,
          abi: flightMarketAbi,
          functionName: "addLiquidity",
          args: [amount],
        });
      }),
    removeLiquidity: (market: Address, shares: bigint) =>
      run(() =>
        writeContractAsync({
          address: market,
          abi: flightMarketAbi,
          functionName: "removeLiquidity",
          args: [shares],
        }),
      ),
    redeem: (market: Address) => write(market, "redeem"),
    refund: (market: Address) => write(market, "refund"),
    faucet: () =>
      run(() => {
        if (!address) throw new Error("Connect a wallet first");
        return writeContractAsync({
          address: env.contracts.collateral,
          abi: collateralAbi,
          functionName: "mint",
          args: [address, FAUCET_AMOUNT],
        });
      }),
  };
}
