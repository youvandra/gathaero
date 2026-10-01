export type MarketStatus = "open" | "delayed" | "resolved";

export type MarketSummary = {
  code: string;
  route: string;
  date: string;
  probability: number;
  volume: number;
  status: MarketStatus;
  history: number[];
};

export const DEFAULT_MARKET_CODE = "SQ956";

export const MOCK_MARKETS: MarketSummary[] = [
  {
    code: "SQ956",
    route: "SIN → CGK",
    date: "15 Nov",
    probability: 0.062,
    volume: 12_400,
    status: "open",
    history: [4.1, 4.6, 5.2, 4.9, 5.6, 5.4, 6.0, 6.2],
  },
  {
    code: "AK380",
    route: "SIN → KUL",
    date: "16 Nov",
    probability: 0.091,
    volume: 8_150,
    status: "open",
    history: [6.2, 6.8, 7.4, 7.1, 8.0, 8.6, 8.8, 9.1],
  },
  {
    code: "TR286",
    route: "SIN → CGK",
    date: "15 Nov",
    probability: 0.062,
    volume: 5_480,
    status: "delayed",
    history: [3.2, 3.6, 3.1, 4.0, 4.8, 5.5, 6.0, 6.2],
  },
  {
    code: "CZ352",
    route: "SIN → CAN",
    date: "17 Nov",
    probability: 0.044,
    volume: 3_920,
    status: "open",
    history: [5.0, 4.8, 4.5, 4.6, 4.3, 4.5, 4.4, 4.4],
  },
  {
    code: "SQ118",
    route: "SIN → KUL",
    date: "18 Nov",
    probability: 0.078,
    volume: 6_740,
    status: "open",
    history: [5.5, 5.9, 6.4, 6.1, 6.8, 7.2, 7.5, 7.8],
  },
  {
    code: "QZ521",
    route: "SIN → DPS",
    date: "19 Nov",
    probability: 0.114,
    volume: 4_310,
    status: "open",
    history: [8.1, 8.6, 9.2, 9.8, 10.4, 10.9, 11.2, 11.4],
  },
  {
    code: "GA410",
    route: "CGK → DPS",
    date: "20 Nov",
    probability: 0.036,
    volume: 2_780,
    status: "resolved",
    history: [4.4, 4.1, 3.9, 3.7, 3.8, 3.6, 3.7, 3.6],
  },
];

export const MOCK_TOTALS = {
  flightsLive: 1248,
  avgDelayRate: 0.062,
  protectedUsdc: 418_000,
  volume24h: 96_400,
};
