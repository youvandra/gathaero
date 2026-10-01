import "dotenv/config";

export type FeederConfig = {
  rpcUrl: string;
  privateKey: `0x${string}`;
  mockFeederAddress: `0x${string}`;
  flightNumber: string;
  flightDate: string;
  fallbackDelayMinutes: number;
  rapidApi: { key: string; host: string } | null;
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
};

const hexEnv = (name: string): `0x${string}` => {
  const value = requireEnv(name);
  if (!value.startsWith("0x")) {
    throw new Error(`${name} must be a hex string`);
  }
  return value as `0x${string}`;
};

export function loadConfig(): FeederConfig {
  const key = process.env.RAPIDAPI_KEY;

  return {
    rpcUrl: process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc",
    privateKey: hexEnv("FEEDER_PRIVATE_KEY"),
    mockFeederAddress: hexEnv("MOCK_FEEDER_ADDRESS"),
    flightNumber: process.env.FLIGHT_NUMBER ?? "SQ956",
    flightDate: process.env.FLIGHT_DATE ?? new Date().toISOString().slice(0, 10),
    fallbackDelayMinutes: Number(process.env.DELAY_MINUTES ?? 150),
    rapidApi: key ? { key, host: process.env.RAPIDAPI_HOST ?? "aerodatabox.p.rapidapi.com" } : null,
  };
}
