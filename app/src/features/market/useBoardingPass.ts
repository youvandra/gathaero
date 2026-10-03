import { useCallback, useState } from "react";

const STORAGE_KEY = "gathaero.boardingPass";

type PassStore = Record<string, string>;

function readStore(): PassStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PassStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: PassStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useBoardingPass() {
  const [store, setStore] = useState<PassStore>(readStore);

  const isVerified = useCallback(
    (flightCode: string) => Boolean(store[flightCode.toUpperCase()]),
    [store],
  );

  const referenceOf = useCallback((flightCode: string) => store[flightCode.toUpperCase()], [store]);

  const verify = useCallback((flightCode: string, reference: string) => {
    const next = { ...readStore(), [flightCode.toUpperCase()]: reference };
    writeStore(next);
    setStore(next);
  }, []);

  const revoke = useCallback((flightCode: string) => {
    const next = readStore();
    delete next[flightCode.toUpperCase()];
    writeStore(next);
    setStore(next);
  }, []);

  return { isVerified, referenceOf, verify, revoke };
}
