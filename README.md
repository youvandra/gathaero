# Gathæro

Flight-risk market: predict and protect against flight delays, settled on-chain.
Prediction market and delay protection are the same primitive — a position on a
flight's outcome. Hedgers get protection, traders get a market, settlement is instant.

Built on **Arbitrum** (EVM L2). Oracle via **Chainlink CRE** + **AeroDataBox**.

## Settlement

Delay is actual arrival minus the scheduled arrival recorded on-chain when the flight was
listed. Actual arrival is AeroDataBox `revisedTime` (gate arrival, the airline on-time
standard), falling back to `runwayTime` (touchdown). A flight settles only once it is
`Arrived` with one of those times; `Canceled` or `Diverted` voids it and refunds everyone.

## Structure
```
contracts/   Solidity + Foundry
app/         Vite + React + TypeScript (PWA)
cre/         Chainlink CRE workflow
feeder/      Mock feeder (fallback oracle)
docs/        Product spec
```

## Networks
- Arbitrum Sepolia — chain id `421614`, RPC `https://sepolia-rollup.arbitrum.io/rpc`
- Arbitrum One — chain id `42161`, RPC `https://arb1.arbitrum.io/rpc`

## Commands
```
cd contracts && forge build && forge test
cd app       && npm install && npm run dev && npm run build
cd feeder    && npm install && npm run list && npm run resolve -- --watch
cd cre       && see README
```

See `AGENTS.md` for conventions, `docs/spec.md` for the product spec, and
`docs/STATUS.md` for the current build status and handoff.
