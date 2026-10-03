import type { RapidApi } from "./config.js";

type Movement = {
  airport?: { iata?: string };
  scheduledTime?: { utc: string; local?: string };
  revisedTime?: { utc: string };
  runwayTime?: { utc: string };
};

type AeroDataBoxFlight = {
  status: string;
  departure: Movement;
  arrival: Movement;
};

export type FlightOutcome = "pending" | "landed" | "void";

export type FlightSnapshot = {
  status: string;
  outcome: FlightOutcome;
  route: string | null;
  scheduledArrival: number;
  actualArrival: number;
};

const VOID_STATUSES = new Set(["Canceled", "CanceledUncertain", "Diverted"]);

const parseUtc = (value: string): number => Date.parse(value.replace(" ", "T"));

function outcomeOf(status: string): FlightOutcome {
  if (status === "Arrived") return "landed";
  if (VOID_STATUSES.has(status)) return "void";
  return "pending";
}

function routeOf(flight: AeroDataBoxFlight): string | null {
  const from = flight.departure.airport?.iata;
  const to = flight.arrival.airport?.iata;
  return from && to ? `${from}-${to}` : null;
}

export async function fetchFlight(
  flightNumber: string,
  dateLocal: string,
  api: RapidApi,
  route?: string,
): Promise<FlightSnapshot> {
  const response = await fetch(`https://${api.host}/flights/number/${flightNumber}/${dateLocal}`, {
    headers: { "X-RapidAPI-Key": api.key, "X-RapidAPI-Host": api.host },
  });

  if (response.status === 204) throw new Error(`No data for ${flightNumber} on ${dateLocal}`);
  if (!response.ok) throw new Error(`AeroDataBox error ${response.status}`);

  const legs = (await response.json()) as AeroDataBoxFlight[];
  const departsOnDate = (leg: AeroDataBoxFlight) =>
    leg.departure.scheduledTime?.local?.startsWith(dateLocal) ?? false;
  const matchesRoute = (leg: AeroDataBoxFlight) => route === undefined || routeOf(leg) === route;
  const flight =
    legs.find((leg) => departsOnDate(leg) && matchesRoute(leg)) ??
    legs.find(departsOnDate) ??
    legs.find(matchesRoute);
  const scheduled = flight?.arrival.scheduledTime?.utc;
  if (!flight || !scheduled) throw new Error(`No arrival schedule for ${flightNumber}`);

  // Delay follows the airline on-time standard: gate arrival, which AeroDataBox
  // reports as revisedTime once the flight has arrived. Touchdown is the fallback.
  // With neither, the flight stays pending rather than settling as on time.
  const arrival = flight.arrival;
  const actual = arrival.revisedTime?.utc ?? arrival.runwayTime?.utc;
  const outcome = outcomeOf(flight.status);

  return {
    status: flight.status,
    outcome: outcome === "landed" && !actual ? "pending" : outcome,
    route: routeOf(flight),
    scheduledArrival: Math.floor(parseUtc(scheduled) / 1000),
    actualArrival: Math.floor(parseUtc(actual ?? scheduled) / 1000),
  };
}
