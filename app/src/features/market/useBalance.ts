import { useAccount, useReadContract } from "wagmi";

import { env, isConfigured } from "../../config/env";
import { collateralAbi } from "../../lib/abi";

export function useCollateralBalance() {
  const { address } = useAccount();
  const { data } = useReadContract({
    address: env.contracts.collateral,
    abi: collateralAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConfigured && Boolean(address), refetchInterval: 15_000 },
  });
  return data;
}
