import {
  createPublicClient,
  createWalletClient,
  http,
  toHex,
  type Chain,
  type EIP1193RequestFn,
  type Transport,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia, foundry } from "viem/chains";

import type { FeederConfig } from "./config.js";

const CHAINS: Record<number, Chain> = {
  [arbitrumSepolia.id]: arbitrumSepolia,
  [foundry.id]: foundry,
};

const GAS_BUFFER_PERCENT = 130n;

function withGasBuffer(inner: Transport): Transport {
  return (options) => {
    const transport = inner(options);
    const request = (async (args) => {
      const result = await transport.request(args);
      if (args.method !== "eth_estimateGas") return result;
      return toHex((BigInt(result as string) * GAS_BUFFER_PERCENT) / 100n);
    }) as EIP1193RequestFn;
    return { ...transport, request };
  };
}

export function clientsFor(config: FeederConfig) {
  const chain = CHAINS[config.chainId];
  if (!chain) throw new Error(`Unsupported chain id ${config.chainId}`);

  const transport = http(config.rpcUrl);
  const account = privateKeyToAccount(config.privateKey);

  return {
    account,
    publicClient: createPublicClient({ chain, transport, pollingInterval: 250 }),
    walletClient: createWalletClient({ account, chain, transport: withGasBuffer(transport) }),
  };
}

export type Clients = ReturnType<typeof clientsFor>;
