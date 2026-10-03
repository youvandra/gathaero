import { useCallback, useState } from "react";
import { useAccount } from "wagmi";

type PassStore = Record<string, string>;

const storageKey = (address: string): string => `gathaero.boardingPass.${address.toLowerCase()}`;

function readStore(address?: string): PassStore {
  if (!address) return {};
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? (JSON.parse(raw) as PassStore) : {};
  } catch {
    return {};
  }
}

function writeStore(address: string, store: PassStore): void {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(store));
  } catch {
    return;
  }
}

export function useBoardingPass() {
  const { address } = useAccount();
  const [owner, setOwner] = useState(address);
  const [store, setStore] = useState<PassStore>(() => readStore(address));

  if (owner !== address) {
    setOwner(address);
    setStore(readStore(address));
  }

  const isVerified = useCallback(
    (flightCode: string) => Boolean(store[flightCode.toUpperCase()]),
    [store],
  );

  const verify = useCallback(
    (flightCode: string, reference: string) => {
      if (!address) return;
      const next = { ...readStore(address), [flightCode.toUpperCase()]: reference };
      writeStore(address, next);
      setStore(next);
    },
    [address],
  );

  return { isVerified, verify };
}
