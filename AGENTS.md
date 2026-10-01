# Gathæro — Agent & Contributor Guide

Flight-risk market: prediction + delay protection, settled on-chain.
Target: Arbitrum Open House Singapore buildathon.

## Non-negotiables
- **Scalable by default.** Every module must grow without rewrites.
- **Expert structure.** Clear separation: `src/`, domain subfolders, `interfaces/`, `lib/`, `test/`.
- **Minimal comments.** Code must be self-explanatory. No narration comments.
- **No spaghetti.** Small pure functions, single responsibility, explicit types.
- **Typed everywhere.** Solidity explicit types; TypeScript `strict: true`, no `any`.
- **One task = one commit.** Commit after each completed task.

## Stack
| Layer | Choice |
|---|---|
| Contracts | Solidity + Foundry (`>=1.8.0`) |
| Chain | Arbitrum Sepolia (421614) / One (42161) |
| Frontend | Vite + React + TypeScript + PWA |
| Web3 client | viem (`>=2.40.0`) + wagmi |
| Oracle | Chainlink CRE (TypeScript) |
| Flight data | AeroDataBox (RapidAPI) |
| Fallback oracle | MockFeeder |

## Layout
```
contracts/   Foundry project
  src/       domain-grouped contracts
  test/      forge tests
  script/    deploy scripts
app/         Vite + React + TS (PWA)
cre/         Chainlink CRE workflow
feeder/      mock feeder (Node + viem)
```

## Commands
```
cd contracts && forge build && forge test
cd app && npm run dev && npm run build
cd feeder && npm run start
```

## Conventions
- Branch: `main`. Commit style: `type(scope): summary` (feat/fix/refactor/test/docs/chore).
- Env/secrets via `.env` (never committed). `.env.example` describes keys.
- Contracts: use OpenZeppelin; custom errors over revert strings; events on state changes.
