type Address = `0x${string}`;

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

const readAddress = (value: unknown): Address =>
  typeof value === "string" && value.startsWith("0x") ? (value as Address) : ZERO_ADDRESS;

const readString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const readBigInt = (value: unknown): bigint =>
  typeof value === "string" && /^\d+$/.test(value) ? BigInt(value) : 0n;

export const env = {
  chainId: Number(readString(import.meta.env.VITE_CHAIN_ID, "421614")),
  rpcUrl: readString(import.meta.env.VITE_RPC_URL, "https://sepolia-rollup.arbitrum.io/rpc"),
  deployBlock: readBigInt(import.meta.env.VITE_DEPLOY_BLOCK),
  faucet: import.meta.env.VITE_FAUCET !== "false",
  /** Testnet only: offers a generated boarding pass so anyone can try the passenger flow. */
  demoPass: import.meta.env.VITE_DEMO_PASS !== "false",
  verifierUrl: readString(import.meta.env.VITE_VERIFIER_URL, ""),
  contracts: {
    marketFactory: readAddress(import.meta.env.VITE_MARKET_FACTORY),
    marketLens: readAddress(import.meta.env.VITE_MARKET_LENS),
    collateral: readAddress(import.meta.env.VITE_COLLATERAL),
    passRegistry: readAddress(import.meta.env.VITE_PASS_REGISTRY),
  },
} as const;

export const isConfigured =
  env.contracts.marketLens !== ZERO_ADDRESS && env.contracts.collateral !== ZERO_ADDRESS;
