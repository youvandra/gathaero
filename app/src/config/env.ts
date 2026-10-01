type Address = `0x${string}`;

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

const readAddress = (value: unknown, fallback: Address): Address =>
  typeof value === "string" && value.startsWith("0x") ? (value as Address) : fallback;

const readString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

export const env = {
  rpcUrl: readString(import.meta.env.VITE_RPC_URL, "https://sepolia-rollup.arbitrum.io/rpc"),
  walletConnectProjectId: readString(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID, ""),
  contracts: {
    marketFactory: readAddress(import.meta.env.VITE_MARKET_FACTORY, ZERO_ADDRESS),
    oracle: readAddress(import.meta.env.VITE_ORACLE, ZERO_ADDRESS),
    usdc: readAddress(import.meta.env.VITE_USDC, ZERO_ADDRESS),
  },
} as const;
