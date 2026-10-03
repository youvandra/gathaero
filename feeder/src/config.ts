import "dotenv/config";
import type { Address, Hex } from "viem";

export type RapidApi = { key: string; host: string };

export type FeederConfig = {
  rpcUrl: string;
  chainId: number;
  privateKey: Hex;
  contracts: {
    factory: Address;
    lens: Address;
    registry: Address;
    feeder: Address;
    collateral: Address;
  };
  rapidApi: RapidApi | null;
  landedGraceMinutes: number;
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
};

const hexEnv = <T extends Hex>(name: string): T => {
  const value = requireEnv(name);
  if (!value.startsWith("0x")) throw new Error(`${name} must be a hex string`);
  return value as T;
};

export function loadConfig(): FeederConfig {
  const key = process.env.RAPIDAPI_KEY;

  return {
    rpcUrl: process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc",
    chainId: Number(process.env.CHAIN_ID ?? 421614),
    privateKey: hexEnv("FEEDER_PRIVATE_KEY"),
    contracts: {
      factory: hexEnv("MARKET_FACTORY"),
      lens: hexEnv("MARKET_LENS"),
      registry: hexEnv("FLIGHT_REGISTRY"),
      feeder: hexEnv("MOCK_FEEDER_ADDRESS"),
      collateral: hexEnv("COLLATERAL"),
    },
    rapidApi: key ? { key, host: process.env.RAPIDAPI_HOST ?? "aerodatabox.p.rapidapi.com" } : null,
    landedGraceMinutes: Number(process.env.LANDED_GRACE_MINUTES ?? 30),
  };
}
