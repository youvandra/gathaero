import type { FlightMarket } from "../market/model";

export type BoardingPass = {
  passenger: string;
  bookingReference: string;
  from: string;
  to: string;
  flight: string;
  dayOfYear: number;
  seat: string;
};

export type PassCheck = { ok: true } | { ok: false; reason: string };

const MIN_LENGTH = 58;

const field = (raw: string, start: number, length: number): string =>
  raw.slice(start, start + length).trim();

function normalizeFlight(carrier: string, number: string): string {
  const match = /^0*(\d+)([A-Z]?)$/.exec(number);
  return match ? `${carrier}${match[1]}${match[2]}` : `${carrier}${number}`;
}

export function parseBoardingPass(raw: string): BoardingPass | null {
  const text = raw.replace(/\r?\n/g, "");
  if (text.length < MIN_LENGTH || text[0] !== "M") return null;

  const dayOfYear = Number(field(text, 44, 3));
  const carrier = field(text, 36, 3);
  const from = field(text, 30, 3);
  const to = field(text, 33, 3);
  if (!carrier || from.length !== 3 || to.length !== 3 || !Number.isInteger(dayOfYear)) return null;

  return {
    passenger: field(text, 2, 20).replace("/", " "),
    bookingReference: field(text, 23, 7),
    from,
    to,
    flight: normalizeFlight(carrier, field(text, 39, 5)),
    dayOfYear,
    seat: field(text, 48, 4).replace(/^0+/, ""),
  };
}

function dayOfYearUtc(seconds: number): number {
  const date = new Date(seconds * 1000);
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

export function checkPassForMarket(pass: BoardingPass, market: FlightMarket): PassCheck {
  if (pass.flight.toUpperCase() !== market.code.toUpperCase()) {
    return { ok: false, reason: `This pass is for ${pass.flight}, not ${market.code}.` };
  }

  const [from, to] = market.route.split(" → ");
  if (pass.from !== from || pass.to !== to) {
    return {
      ok: false,
      reason: `This pass is for ${pass.from} → ${pass.to}, but this market is ${market.route}.`,
    };
  }

  const gap = Math.abs(pass.dayOfYear - dayOfYearUtc(market.departureTimestamp));
  if (gap > 1 && gap < 364) {
    return { ok: false, reason: `This pass is for a different day than ${market.date}.` };
  }

  return { ok: true };
}
