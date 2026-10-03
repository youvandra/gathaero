import type { FlightMarket } from "./model";
import { cumulativeVolume, probabilitySeries, useTrades } from "./useActivity";

export function useMarketTrends(flights: FlightMarket[]) {
  const markets = flights.flatMap((flight) => [
    ...(flight.protection ? [flight.protection.address] : []),
    ...flight.buckets.map((bucket) => bucket.address),
  ]);
  const { data: trades = [] } = useTrades(markets);

  const trendOf = (flight: FlightMarket): number[] =>
    flight.protection
      ? probabilitySeries(trades, flight.protection.address, flight.delayProbability)
      : [0, 0];

  return { trades, trendOf, volumeSeries: cumulativeVolume(trades) };
}
