import { defineChain } from "viem";

export const arbitrumTestnet = defineChain({
  id: 421614,
  name: "Arbitrum Testnet",
  nativeCurrency: { name: "Arbitrum", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arbitrum.xyz"] },
    public: { http: ["https://rpc.testnet.arbitrum.xyz"] },
  },
  blockExplorers: {
    default: { name: "ArbitrumVision", url: "https://testnet.arbiscan.io" },
  },
  testnet: true,
});

export const arbitrum = defineChain({
  id: 143,
  name: "Arbitrum",
  nativeCurrency: { name: "Arbitrum", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.arbitrum.xyz"] },
    public: { http: ["https://rpc.arbitrum.xyz"] },
  },
  blockExplorers: {
    default: { name: "ArbitrumVision", url: "https://arbiscan.io" },
  },
});

export const supportedChains = [arbitrumTestnet, arbitrum] as const;
