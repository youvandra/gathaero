# Gathæro — Status & Handoff

Flight-risk market on **Arbitrum**: predict and protect against flight delays, settled on-chain.
Prediction and delay protection are the same primitive — a position on a flight's outcome.

- **Chain:** Arbitrum Sepolia (421614) / Arbitrum One (42161)
- **Repo:** `github.com/youvandra/gathaero` (branch `main`, 23 commits)
- **Remote push:** pending — HTTPS needs a credential (PAT) or a manual `git push`

## Decisions locked
| Area | Decision |
|---|---|
| Chain | Arbitrum (was Monad; history scrubbed) |
| Dashboard UI | **Cordon** component system (`Documents/cordon-ui`, local file dep), font overridden to Geist |
| Landing | nexum-style dark hero + video, brand CTA rose |
| Brand | wordmark **gathæro**, web icon = **æ** |
| Products | **Protection** (hedge) vs **Prediction** (ATA buckets) — split |
| Regulation | Protection is ticket-gated (insurable interest); Prediction = speculative venue |
| Force majeure | `resolveVoid()` → refund buyers, return LP principal |

## Structure
```
contracts/   Foundry (Solidity 0.8.28)
app/         Vite + React + TS + Tailwind + PWA, Cordon UI, wagmi/viem
cre/         Chainlink CRE workflow (AeroDataBox → FlightOracleReceiver)
feeder/      Node + viem mock feeder (fallback oracle)
docs/        spec.md (product), STATUS.md (this)
```

## Contracts (`contracts/src`)
| Contract | Role |
|---|---|
| `FlightRegistry` | flights (number, scheduledArrival, delayThreshold) |
| `MarketFactory` | `createProtection` / `createThreshold` / `createRange` + lookups |
| `FlightMarket` | CPMM AMM over 2 outcome tokens; buy, resolve, redeem, liquidity, **void/refund** |
| `MarketKind` | `Protection` (delay binary) · `Threshold` (ATA ≤ strike) · `Range` (lower < ATA ≤ upper) |
| `FlightOracleConsumer` | multi-reporter store of resolutions |
| `FlightOracleReceiver` | `IReceiver` for Chainlink CRE reports |
| `MockFeeder` | demo reporter |
| `OutcomeToken` | ERC-1155 (ON_TIME=0, DELAYED=1) |
| `MockERC20` | local collateral |

**Force majeure:** `contributions[trader]` tracked on buy; `resolveVoid()` (resolver) → `refund()` returns
contributions, `removeLiquidity` returns `lpCollateral` pro-rata. Invariant: `lpCollateral + Σcontributions = total`.

Tests: `forge test` → **15/15 pass** (protection, threshold, range, void).

## App (`app/src`)
- **Routes** (BrowserRouter, clean URLs):
  - Public: `/` landing, `/markets`, `/how`, `/docs`
  - App: `/app` (Home), `/app/market` (list), `/app/market/:code` (detail), `/app/positions`, `/app/vault`, `/app/earn` (coming soon)
- **Design:** Cordon (paper/ceramic, LED-free numbers, tables, charts) + toasts + input modals.
- **Market detail:** `Protection | Predictions` segmented.
  - Protection: probability split, **boarding-pass gate** (insurable interest), buy modal → toast.
  - Predictions: ATA **range buckets** ("07:30–07:40"), Yes/No, wired to `rangeMarketOf`.
- **Positions:** DataTable with PnL + claim/sell toasts.
- **Vault:** KPIs, TVL chart, add-liquidity modal, route-pools table.
- **Mocks:** `features/dashboard/mockMarkets.ts` (display when contracts not configured).

## Oracle
- **CRE** (`cre/`): cron → AeroDataBox `/flights/number/{n}/{date}` → consensus → report to `FlightOracleReceiver`.
  Needs `RAPIDAPI_KEY` secret + Arbitrum Sepolia enabled for tenant + deploy access.
- **Feeder** (`feeder/`): Node + viem, posts via `MockFeeder`. Fallback for demos.
- **AeroDataBox:** RapidAPI Basic (free 400 units). Delay = `arrival.revised − scheduled`. Verified working.

## Run
```
cd contracts && forge build && forge test
cd app       && npm install && npm run dev        # http://127.0.0.1:5173
cd feeder    && npm install && npm run start
cd cre       && see cre/README.md
```
Env (`app/.env.example`): `VITE_RPC_URL`, `VITE_MARKET_FACTORY`, `VITE_ORACLE`, `VITE_USDC`,
`VITE_WALLETCONNECT_PROJECT_ID`. Feeder/CRE: `RAPIDAPI_KEY`, keys.

## Not done yet
- **Deploy contracts** to Arbitrum Sepolia (needs funded key + faucet ETH) → then UI goes "Live".
- Wire **Home KPIs / Positions / Vault** fully on-chain (currently mock when unconfigured).
- Public pages (Markets/How/Docs) still nexum-style — could adopt Cordon.
- Skeleton loading states; command palette; wallet dropdown menu.
- Terms copy for force majeure / insurable interest in UI.

## Open questions
- Exact Arbitrum Open House tracks/bounties (HackQuest, login-gated).
- CRE: is Arbitrum Sepolia enabled for our org? (`cre workflow supported-chains`)
- Push: which credential to use (PAT) or manual push.
