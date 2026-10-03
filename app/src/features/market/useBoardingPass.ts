import type { Hex } from "viem";
import { useAccount, useReadContract } from "wagmi";

import { env, ZERO_ADDRESS } from "../../config/env";
import { passRegistryAbi } from "../../lib/abi";
import { AppError } from "../../lib/errors";

export type PassAttestation = {
  passHash: Hex;
  expiry: string;
  signature: Hex;
  passenger: string;
  flight: string;
  seat: string;
};

export function usePassenger(flightId: Hex) {
  const { address } = useAccount();
  const enabled = env.contracts.passRegistry !== ZERO_ADDRESS && Boolean(address);
  const { data, isPending } = useReadContract({
    address: env.contracts.passRegistry,
    abi: passRegistryAbi,
    functionName: "isPassenger",
    args: address ? [flightId, address] : undefined,
    query: { enabled },
  });
  return {
    isPassenger: data === true,
    gated: env.contracts.passRegistry !== ZERO_ADDRESS,
    isLoading: enabled && isPending,
  };
}

export async function requestAttestation(
  flightId: Hex,
  wallet: Hex,
  barcode: string,
): Promise<PassAttestation> {
  if (!env.verifierUrl) {
    throw new AppError("Verifier unavailable", "Boarding pass checks are not configured.");
  }
  let response: Response;
  try {
    response = await fetch(`${env.verifierUrl}/passes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ flightId, wallet, barcode }),
    });
  } catch {
    throw new AppError("Verifier unreachable", "Check your connection and try again.");
  }
  const body = (await response.json().catch(() => ({}))) as Partial<PassAttestation> & {
    error?: string;
  };
  if (!response.ok || !body.signature || !body.passHash || !body.expiry) {
    throw new AppError("Boarding pass rejected", body.error ?? "Try scanning again.");
  }
  return body as PassAttestation;
}
