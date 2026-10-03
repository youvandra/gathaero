import { keccak256, toBytes, type Hex } from "viem";

import type { Clients } from "./chain.js";

export function flightIdOf(number: string, date: string): Hex {
  return keccak256(toBytes(`${number.replace(/\s+/g, "").toUpperCase()}-${date}`));
}

export async function confirm(clients: Clients, pending: Promise<Hex>): Promise<void> {
  const hash = await pending;
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction reverted: ${hash}`);
}
