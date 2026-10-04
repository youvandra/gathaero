import type { FlightMarket } from "../market/model";

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "0123456789";

const pick = (alphabet: string, length: number): string =>
  Array.from(
    crypto.getRandomValues(new Uint32Array(length)),
    (value) => alphabet[value % alphabet.length],
  ).join("");

const dayOfYearUtc = (seconds: number): number => {
  const date = new Date(seconds * 1000);
  return Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
};

export type DemoPass = { barcode: string; passenger: string; booking: string; seat: string };

/**
 * A fresh IATA BCBP barcode for an open testnet flight, with a random name and booking so each
 * one links to a new wallet. Barcodes carry no airline signature, so this is exactly what a
 * real one looks like to the verifier; it exists so judges and testers can try the flow.
 */
export function demoPassFor(flight: FlightMarket): DemoPass {
  const match = /^([A-Z0-9]{2})(\d{1,4})([A-Z]?)$/.exec(flight.code.toUpperCase());
  const carrier = match?.[1] ?? flight.code.slice(0, 2);
  const number = `${(match?.[2] ?? "0").padStart(4, "0")}${match?.[3] || " "}`;
  const [from = "", to = ""] = flight.route.split(" → ");
  const surname = `TESTER${pick(LETTERS, 3)}`;
  const passenger = `${surname}/DEMO`;
  const booking = pick(LETTERS + DIGITS, 6);
  const seat = `${pick("123456789", 1)}${pick(DIGITS, 1)}${pick("ABCDEF", 1)}`;
  const julian = String(dayOfYearUtc(flight.departureTimestamp)).padStart(3, "0");

  const barcode = [
    "M1",
    passenger.padEnd(20).slice(0, 20),
    "E",
    booking.padEnd(7),
    from,
    to,
    carrier.padEnd(3),
    number,
    julian,
    "Y",
    seat.padStart(4, "0"),
    pick(DIGITS, 4).padEnd(5),
    "1",
    "00",
  ].join("");
  return { barcode, passenger: passenger.replace("/", " "), booking, seat };
}
