export type MarketStatus = "open" | "delayed" | "resolved";

export type Bucket = {
  from: string;
  to: string;
  yes: number;
};

export type FlightMarket = {
  code: string;
  route: string;
  date: string;
  isoDate: string;
  scheduledArrival: string;
  status: MarketStatus;
  delayProbability: number;
  premium: number;
  payout: number;
  volume: number;
  openInterest: number;
  history: number[];
  expectedAta: string;
  buckets: Bucket[];
};

export const DEFAULT_MARKET_CODE = "SQ956";

export const MOCK_MARKETS: FlightMarket[] = [
  {
    code: "SQ956",
    route: "SIN → CGK",
    date: "15 Nov",
    isoDate: "2026-10-01",
    scheduledArrival: "07:44",
    status: "open",
    delayProbability: 0.062,
    premium: 6.2,
    payout: 100,
    volume: 12_400,
    openInterest: 3_200,
    history: [4.1, 4.6, 5.2, 4.9, 5.6, 5.4, 6.0, 6.2],
    expectedAta: "07:41",
    buckets: [
      { from: "07:30", to: "07:40", yes: 0.12 },
      { from: "07:40", to: "07:50", yes: 0.55 },
      { from: "07:50", to: "08:00", yes: 0.26 },
      { from: "08:00", to: "08:10", yes: 0.07 },
    ],
  },
  {
    code: "AK380",
    route: "SIN → KUL",
    date: "16 Nov",
    isoDate: "2026-11-16",
    scheduledArrival: "09:20",
    status: "open",
    delayProbability: 0.091,
    premium: 9.1,
    payout: 100,
    volume: 8_150,
    openInterest: 2_640,
    history: [6.2, 6.8, 7.4, 7.1, 8.0, 8.6, 8.8, 9.1],
    expectedAta: "09:27",
    buckets: [
      { from: "09:05", to: "09:15", yes: 0.15 },
      { from: "09:15", to: "09:25", yes: 0.5 },
      { from: "09:25", to: "09:35", yes: 0.27 },
      { from: "09:35", to: "09:45", yes: 0.08 },
    ],
  },
  {
    code: "TR286",
    route: "SIN → CGK",
    date: "15 Nov",
    isoDate: "2026-11-15",
    scheduledArrival: "14:05",
    status: "delayed",
    delayProbability: 0.62,
    premium: 62.0,
    payout: 100,
    volume: 5_480,
    openInterest: 1_980,
    history: [32, 38, 44, 51, 57, 60, 61, 62],
    expectedAta: "15:02",
    buckets: [
      { from: "14:05", to: "14:20", yes: 0.12 },
      { from: "14:20", to: "14:35", yes: 0.34 },
      { from: "14:35", to: "14:50", yes: 0.36 },
      { from: "14:50", to: "15:05", yes: 0.18 },
    ],
  },
  {
    code: "CZ352",
    route: "SIN → CAN",
    date: "17 Nov",
    isoDate: "2026-11-17",
    scheduledArrival: "12:20",
    status: "open",
    delayProbability: 0.044,
    premium: 4.4,
    payout: 100,
    volume: 3_920,
    openInterest: 1_120,
    history: [5.0, 4.8, 4.5, 4.6, 4.3, 4.5, 4.4, 4.4],
    expectedAta: "12:18",
    buckets: [
      { from: "12:10", to: "12:20", yes: 0.3 },
      { from: "12:20", to: "12:30", yes: 0.5 },
      { from: "12:30", to: "12:40", yes: 0.15 },
      { from: "12:40", to: "12:50", yes: 0.05 },
    ],
  },
  {
    code: "QZ521",
    route: "SIN → DPS",
    date: "19 Nov",
    isoDate: "2026-11-19",
    scheduledArrival: "16:40",
    status: "open",
    delayProbability: 0.114,
    premium: 11.4,
    payout: 100,
    volume: 4_310,
    openInterest: 1_450,
    history: [8.1, 8.6, 9.2, 9.8, 10.4, 10.9, 11.2, 11.4],
    expectedAta: "16:52",
    buckets: [
      { from: "16:30", to: "16:45", yes: 0.18 },
      { from: "16:45", to: "17:00", yes: 0.4 },
      { from: "17:00", to: "17:15", yes: 0.28 },
      { from: "17:15", to: "17:30", yes: 0.14 },
    ],
  },
  {
    code: "GA410",
    route: "CGK → DPS",
    date: "20 Nov",
    isoDate: "2026-11-20",
    scheduledArrival: "18:15",
    status: "resolved",
    delayProbability: 0.036,
    premium: 3.6,
    payout: 100,
    volume: 2_780,
    openInterest: 640,
    history: [4.4, 4.1, 3.9, 3.7, 3.8, 3.6, 3.7, 3.6],
    expectedAta: "18:12",
    buckets: [
      { from: "18:05", to: "18:15", yes: 0.35 },
      { from: "18:15", to: "18:25", yes: 0.45 },
      { from: "18:25", to: "18:35", yes: 0.15 },
      { from: "18:35", to: "18:45", yes: 0.05 },
    ],
  },
];

export const MOCK_TOTALS = {
  flightsLive: 1248,
  avgDelayRate: 0.062,
  protectedUsdc: 418_000,
  volume24h: 96_400,
  openInterest: 42_800,
};

export const MOCK_VOLUME_SERIES = [
  42, 48, 45, 52, 61, 58, 64, 71, 68, 76, 82, 79, 88, 96,
];

export function findMarket(code: string): FlightMarket {
  return (
    MOCK_MARKETS.find((market) => market.code.toLowerCase() === code.toLowerCase()) ??
    MOCK_MARKETS[0]
  );
}
