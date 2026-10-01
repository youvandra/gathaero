# Skyasa

Flight-risk market: predict and protect against flight delays, settled on-chain.
Prediction market and delay protection are the same primitive — a position on a
flight's outcome. Hedgers get protection, traders get a market, settlement is instant.

Built on **Arbitrum** (EVM L1). Oracle via **Chainlink CRE** + **AeroDataBox**.

## Structure
```
contracts/   Solidity + Foundry
app/         Vite + React + TypeScript (PWA)
cre/         Chainlink CRE workflow
feeder/      Mock feeder (fallback oracle)
```

## Networks
- Arbitrum Testnet — chain id `421614`, RPC `https://rpc.testnet.arbitrum.xyz`
- Arbitrum Mainnet — chain id `143`, RPC `https://rpc.arbitrum.xyz`

## Quickstart
```
cd contracts && forge build && forge test
cd app && npm install && npm run dev
```

See `AGENTS.md` for conventions and `airtime-spec.md` (parent) for the product spec.
