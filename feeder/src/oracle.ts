import {
  createWalletClient,
  http,
  keccak256,
  parseAbi,
  toBytes,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

import type { FeederConfig } from "./config.js";

const MOCK_FEEDER_ABI = parseAbi([
  "function feed(bytes32 flightId, int32 delayMinutes, bool finalized)",
]);

export function flightIdOf(flightNumber: string, dateLocal: string): Hex {
  const normalized = flightNumber.replace(/\s+/g, "").toUpperCase();
  return keccak256(toBytes(`${normalized}-${dateLocal}`));
}

export async function postResolution(
  config: FeederConfig,
  flightId: Hex,
  delayMinutes: number,
): Promise<Hex> {
  const account = privateKeyToAccount(config.privateKey);
  const wallet = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(config.rpcUrl),
  });

  return wallet.writeContract({
    address: config.mockFeederAddress,
    abi: MOCK_FEEDER_ABI,
    functionName: "feed",
    args: [flightId, delayMinutes, true],
  });
}
