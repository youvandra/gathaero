export type MarketStatus = "open" | "delayed" | "resolved";

export type Strike = {
  time: string;
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
  strikes: Strike[];
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
    strikes: [
      { time: "07:30", yes: 0.14 },
      { time: "07:44", yes: 0.63 },
      { time: "08:00", yes: 0.88 },
      { time: "08:15", yes: 0.95 },
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
    strikes: [
      { time: "09:10", yes: 0.21 },
      { time: "09:20", yes: 0.55 },
      { time: "09:35", yes: 0.82 },
      { time: "09:50", yes: 0.93 },
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
    strikes: [
      { time: "14:05", yes: 0.08 },
      { time: "14:30", yes: 0.34 },
      { time: "15:00", yes: 0.61 },
      { time: "15:30", yes: 0.79 },
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
    strikes: [
      { time: "12:10", yes: 0.18 },
      { time: "12:20", yes: 0.66 },
      { time: "12:35", yes: 0.9 },
      { time: "12:50", yes: 0.97 },
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
    strikes: [
      { time: "16:30", yes: 0.19 },
      { time: "16:40", yes: 0.48 },
      { time: "17:00", yes: 0.76 },
      { time: "17:20", yes: 0.9 },
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
    strikes: [
      { time: "18:05", yes: 0.22 },
      { time: "18:15", yes: 0.7 },
      { time: "18:30", yes: 0.92 },
      { time: "18:45", yes: 0.98 },
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
