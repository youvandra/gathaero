import type { Chain } from "viem";
import { arbitrum, arbitrumSepolia, foundry } from "viem/chains";

import { env } from "./env";

const CHAINS: Record<number, Chain> = {
  [arbitrumSepolia.id]: arbitrumSepolia,
  [arbitrum.id]: arbitrum,
  [foundry.id]: foundry,
};

export const targetChain: Chain = CHAINS[env.chainId] ?? arbitrumSepolia;
