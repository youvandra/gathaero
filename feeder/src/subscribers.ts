import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Address, Hex } from "viem";

/** Emails live off-chain, one file per wallet and flight, and are deleted once the result is sent. */
const root = join(process.env.DATA_DIR ?? "data", "subscribers");

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export const isEmail = (value: string): boolean => value.length <= 254 && EMAIL.test(value);

const fileOf = (flightId: Hex, wallet: Address) =>
  join(root, flightId.toLowerCase(), `${wallet.toLowerCase()}.json`);

export async function subscribe(flightId: Hex, wallet: Address, email: string): Promise<void> {
  await mkdir(join(root, flightId.toLowerCase()), { recursive: true });
  await writeFile(fileOf(flightId, wallet), JSON.stringify({ email, at: Date.now() }));
}

export async function emailOf(flightId: Hex, wallet: Address): Promise<string | null> {
  try {
    const { email } = JSON.parse(await readFile(fileOf(flightId, wallet), "utf8")) as {
      email: string;
    };
    return isEmail(email) ? email : null;
  } catch {
    return null;
  }
}

export async function forget(flightId: Hex, wallet: Address): Promise<void> {
  await rm(fileOf(flightId, wallet), { force: true });
}

export async function subscribedWallets(flightId: Hex): Promise<Address[]> {
  try {
    const files = await readdir(join(root, flightId.toLowerCase()));
    return files.map((file) => file.replace(/\.json$/, "") as Address);
  } catch {
    return [];
  }
}
