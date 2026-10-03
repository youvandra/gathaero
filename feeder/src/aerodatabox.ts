import type { RapidApi } from "./config.js";

type Movement = {
  airport?: { iata?: string };
  scheduledTime?: { utc: string };
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
  delayMinutes: number;
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
): Promise<FlightSnapshot> {
  const response = await fetch(`https://${api.host}/flights/number/${flightNumber}/${dateLocal}`, {
    headers: { "X-RapidAPI-Key": api.key, "X-RapidAPI-Host": api.host },
  });

  if (response.status === 204) throw new Error(`No data for ${flightNumber} on ${dateLocal}`);
  if (!response.ok) throw new Error(`AeroDataBox error ${response.status}`);

  const flight = ((await response.json()) as AeroDataBoxFlight[])[0];
  const scheduled = flight?.arrival.scheduledTime?.utc;
  if (!flight || !scheduled) throw new Error(`No arrival schedule for ${flightNumber}`);

  const arrival = flight.arrival;
  const actual = arrival.runwayTime?.utc ?? arrival.revisedTime?.utc ?? scheduled;
  const scheduledArrival = parseUtc(scheduled);

  return {
    status: flight.status,
    outcome: outcomeOf(flight.status),
    route: routeOf(flight),
    scheduledArrival: Math.floor(scheduledArrival / 1000),
    delayMinutes: Math.round((parseUtc(actual) - scheduledArrival) / 60_000),
  };
}
