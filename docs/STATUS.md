# Gathæro — Status & Handoff

Flight-risk market on **Arbitrum**: predict and protect against flight delays, settled on-chain.
Prediction and delay protection are the same primitive — a position on a flight's outcome.

- **Chain:** Arbitrum Sepolia (421614) / Arbitrum One (42161)
- **Repo:** `github.com/youvandra/gathaero` (branch `main`)
- **Remote:** `git@github.com:youvandra/gathaero.git` (public), pushed over SSH

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

Tests: `forge test` → **33/33 pass** (compiled with `via_ir`).

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

## Live deployment (Arbitrum Sepolia, v2 — 3 Oct 2026)
| Contract | Address |
|---|---|
| Mock USDG (kept from v1) | `0xA50d9454E71aCf152399C872815ae6895cB53229` |
| FlightRegistry | `0xa57225F541E5563ABF0F2C2A4F40C6B7ec8339D2` |
| PassRegistry | `0x08c2f930750e0BF3c3AFb85f8c9a5Cd6fe6737e1` |
| FlightOracleConsumer | `0xF629c6463ba63F372aC0138c5c2e3c511FB3b001` |
| FlightOracleReceiver | `0x6920343789853FCef82432776bDD970E641c0CB3` |
| MockFeeder | `0xa37C09Ad128442aB01C167F7875081D17a5393AF` |
| MarketFactory | `0x9b0402DFe9CE7ad242E970BDcb1476e0120a6ff7` |
| MarketLens | `0xf5144d8599dB21a30f4447112Ca267B80b49E376` |

Deploy block `315254447`. Verifier signer `0x7A5d66675fc1f54E090aEf404832788430e88e97` (no funds).
v1 contracts (no pass gating) are abandoned.

## Boarding pass (insurable interest)
- Buying the **Delayed** side of a protection market reverts `NotPassenger` unless
  `PassRegistry.isPassenger(flightId, msg.sender)`. Prediction markets and the On-time side stay open.
- Flow: app scans the IATA BCBP barcode (camera or photo) → `POST {VITE_VERIFIER_URL}/passes`
  → verifier checks flight number, route and day against the on-chain registry and returns an
  EIP-712 `Pass(flightId, wallet, passHash, expiry)` signature → the user calls
  `PassRegistry.register` from their wallet. `passHash = keccak(flightId, bookingRef, name)`;
  one pass binds to one wallet; signatures expire after 15 minutes.
- Not covered: BCBP barcodes are unsigned, so a forged barcode for a real flight still passes.
  Closing that needs an airline/PNR lookup.
- Verifier runs on the VPS as `gathaero-verifier` on `:8790` (plain HTTP). An app served over
  HTTPS needs the verifier behind HTTPS (domain + nginx) or the browser blocks the call.

Deployer/operator `0x9F846D2054689a439DA8D0619f37F6c70Db03597`.
12 real SIN departures listed from AeroDataBox (3–4 Oct).
The resolver runs on the VPS as systemd unit `gathaero-resolver` (`~/gathaero-feeder`, `.env` mode 600,
MemoryMax 400M, Restart=always). Logs: `journalctl -u gathaero-resolver -f`. To update: rsync `feeder/`
(without `node_modules`/`.env`) then `sudo systemctl restart gathaero-resolver`. Never run a second
resolver with the same key — concurrent nonces collide.

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
