export type FlightStatus = {
  delayMinutes: number;
  status: string;
};

type AeroDataBoxMovement = {
  scheduledTime: { utc: string };
  revisedTime?: { utc: string };
  runwayTime?: { utc: string };
};

type AeroDataBoxFlight = {
  status: string;
  departure: AeroDataBoxMovement;
  arrival: AeroDataBoxMovement;
};

type AeroDataBoxOptions = {
  apiKey: string;
  host: string;
};

export async function fetchFlightStatus(
  flightNumber: string,
  dateLocal: string,
  options: AeroDataBoxOptions,
): Promise<FlightStatus> {
  const url = `https://${options.host}/flights/number/${flightNumber}/${dateLocal}`;
  const response = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": options.apiKey,
      "X-RapidAPI-Host": options.host,
    },
  });

  if (response.status === 204) {
    throw new Error(`No data for ${flightNumber} on ${dateLocal}`);
  }
  if (!response.ok) {
    throw new Error(`AeroDataBox error ${response.status}`);
  }

  const flights = (await response.json()) as AeroDataBoxFlight[];
  const flight = flights[0];
  if (!flight) {
    throw new Error(`Empty response for ${flightNumber}`);
  }

  const arrival = flight.arrival;
  const scheduled = Date.parse(arrival.scheduledTime.utc);
  const actual = Date.parse(arrival.runwayTime?.utc ?? arrival.revisedTime?.utc ?? arrival.scheduledTime.utc);

  return {
    delayMinutes: Math.round((actual - scheduled) / 60_000),
    status: flight.status,
  };
}
