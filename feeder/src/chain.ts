import { createPublicClient, createWalletClient, http, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia, foundry } from "viem/chains";

import type { FeederConfig } from "./config.js";

const CHAINS: Record<number, Chain> = {
  [arbitrumSepolia.id]: arbitrumSepolia,
  [foundry.id]: foundry,
};

export function clientsFor(config: FeederConfig) {
  const chain = CHAINS[config.chainId];
  if (!chain) throw new Error(`Unsupported chain id ${config.chainId}`);

  const transport = http(config.rpcUrl);
  const account = privateKeyToAccount(config.privateKey);

  return {
    account,
    publicClient: createPublicClient({ chain, transport, pollingInterval: 250 }),
    walletClient: createWalletClient({ account, chain, transport }),
  };
}

export type Clients = ReturnType<typeof clientsFor>;
