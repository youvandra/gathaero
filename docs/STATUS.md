# Gathæro — Status & Handoff

Flight-risk market on **Arbitrum**: predict and protect against flight delays, settled on-chain.
Prediction and delay protection are the same primitive — a position on a flight's outcome.

- **Chain:** Arbitrum Sepolia (421614) / Arbitrum One (42161)
- **Repo:** `github.com/youvandra/gathaero` (branch `main`)
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
| `FlightRegistry` | flights (number, route, scheduledArrival, delayThreshold) + `flightIds()` |
| `MarketFactory` | `createProtection` / `createThreshold` / `createRange` + lookups, `rangeMarketsOf` |
| `FlightMarket` | CPMM over 2 outcome tokens; buy, resolve, redeem, liquidity, void/refund, `volume` |
| `MarketLens` | read-only aggregate: `flights()`, `positionsOf(user)` — one call per page |
| `FlightOracleConsumer` | multi-reporter store of resolutions |
| `FlightOracleReceiver` | `IReceiver` for Chainlink CRE reports |
| `MockFeeder` | owner-only reporter used by `feeder/` |
| `MockERC20` | test **USDG** (Global Dollar, 6 dp) with open `mint` = faucet |

- Collateral: `Deploy.s.sol` uses `COLLATERAL` if set (e.g. Paxos USDG), else deploys mock USDG.
- Trading (`buy`, `addLiquidity`) closes at `scheduledArrival`; resolution has no time gate.
- `addLiquidity` is proportional (FPMM style): price never moves, the surplus outcome tokens go back
  to the LP, and each LP's principal is tracked so a void returns exactly what they put in.
- `buy(outcome, amount, minSharesOut)` reverts on slippage; the app passes quote − 1%.
- A finalized resolution can't be overwritten. `FlightOracleReceiver.setWorkflowOwner` limits
  CRE reports to our workflow (the Chainlink forwarder is shared).
- `Bought` event carries `delayedProbability` → price history without an indexer.

Tests: `forge test` → **27/27 pass**.

## App (`app/src`)
- All dashboard data is on-chain via `MarketLens` (no mocks). Hooks in `features/market/`:
  `useFlights`, `usePositions`, `useTrades` (Bought logs from `VITE_DEPLOY_BLOCK`), `useTransact`
  (switch chain → approve if needed → write → wait → refetch), `useCollateralBalance`.
- `/app/*` requires a connected wallet: otherwise `/connect?next=…`; Disconnect returns to `/`.
- Home KPIs, Positions, Vault "your liquidity" and boarding passes are per connected wallet.
- Dollar amounts use en-US grouping (`$35,295.00`) via `lib/format.ts`.
- Wallet button shows USDG balance; clicking it mints 1,000 test USDG (`VITE_FAUCET=false` hides it).
- Times shown in UTC.
- ABIs: `contracts/script/export-abis.sh` regenerates `app/src/lib/abi/generated.ts` and `feeder/src/abi.ts`.

## Feeder (`feeder/`)
- `npm run list` — registers every flight in `src/flights.json`, creates protection + 4 arrival-window
  markets, seeds liquidity and sets starting odds. With `RAPIDAPI_KEY` the schedule/route come
  from AeroDataBox; otherwise from the JSON.
- `npm run resolve` — for flights past arrival + grace: AeroDataBox `Arrived` → feed delay + resolve all
  markets; `Canceled`/`Diverted` → void. `--watch` repeats every 5 min.
- Manual: `npm run resolve -- SQ956 2026-10-04 75` or `... void`.

## Deploy runbook (Arbitrum Sepolia)
```
cd contracts && forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --private-key $KEY --broadcast
# copy addresses into feeder/.env and app/.env (VITE_DEPLOY_BLOCK = deploy block)
cd feeder && npm run list && npm run resolve -- --watch
```
Verified end-to-end on local anvil: list → faucet → buy protection → resolve delayed → claim.

## Live deployment (Arbitrum Sepolia, 3 Oct 2026)
| Contract | Address |
|---|---|
| Mock USDG | `0xA50d9454E71aCf152399C872815ae6895cB53229` |
| FlightRegistry | `0x045B2050aadaFf4B80a2325D63648C09F15AB1F3` |
| FlightOracleConsumer | `0x12d15135b5bBa8EEF0d1098Aa65A15AF503d09c9` |
| FlightOracleReceiver | `0x00Ab57acd260c594A661B6101bDF7e92267AF135` |
| MockFeeder | `0xf86de085E63b00C9fbA300B19807C883deb961e9` |
| MarketFactory | `0x0981D29C89682eD3d619Cb172e417a7ec152945C` |
| MarketLens | `0x98eee74eBcCe4d109B8eA7D653A594435503f0Ab` |

Deploy block `315241943`, deployer/operator `0x9F846D2054689a439DA8D0619f37F6c70Db03597`.
10 real SIN departures listed from AeroDataBox (3–4 Oct). TR884 and SQ638 were registered with the
previous day's leg before the leg-selection fix; they have no markets and the app hides them.
The resolver (`npm run resolve -- --watch`) runs on the operator's Mac — it stops if that machine sleeps.

## Not done yet
- Deploy to Arbitrum Sepolia (needs funded deployer key) and fill `app/.env`.
- `RAPIDAPI_KEY` for real schedules/resolution; `flights.json` times are estimates until then.
- CRE workflow typechecks against cre-sdk 1.23 but has not been simulated; it re-reports landed
  flights each run (the oracle rejects the duplicate) — add a finalized read before going live.
- `cordon-ui` is a `file:../../cordon-ui` dependency outside this repo. Decision: build locally
  (`cd app && npm run build`, with `app/.env` pointing at Sepolia) and upload `app/dist/`; the host
  must rewrite unknown paths to `index.html` (BrowserRouter).
- `VITE_DEPLOY_BLOCK` must be set on public RPCs, or the trade-history log scan starts at block 0.
- Boarding pass check is client-side only (localStorage).
- No sell/exit before settlement (CPMM has no `sell`).
