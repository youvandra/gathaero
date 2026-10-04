import { useReadContract } from "wagmi";

import { env, isConfigured } from "../../config/env";
import { marketLensAbi } from "../../lib/abi";
import { toFlightMarket, type FlightMarket } from "./model";

const REFRESH_MS = 10_000;

export function useFlights() {
  const query = useReadContract({
    address: env.contracts.marketLens,
    abi: marketLensAbi,
    functionName: "flights",
    query: {
      enabled: isConfigured,
      refetchInterval: REFRESH_MS,
      select: (flights) =>
        flights.map(toFlightMarket).filter((flight) => flight.protection !== null),
    },
  });

  return {
    flights: query.data ?? [],
    isLoading: isConfigured && query.isLoading,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}

/** A flight number repeats daily: an explicit flight id wins, then the open leg, then any. */
export function pickFlight(
  flights: FlightMarket[],
  code: string,
  id?: string | null,
): FlightMarket | undefined {
  const exact = id ? flights.find((flight) => flight.id.toLowerCase() === id.toLowerCase()) : null;
  if (exact) return exact;
  const matches = flights.filter((flight) => flight.code.toLowerCase() === code.toLowerCase());
  return matches.find((flight) => flight.status === "open") ?? matches[0];
}
