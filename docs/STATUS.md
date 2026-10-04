# Gathæro — Status & Handoff

Flight-risk market on **Arbitrum**: predict and protect against flight delays, settled on-chain.
Prediction and delay protection are the same primitive — a position on a flight's outcome.

- **Chain:** Arbitrum Sepolia (421614) / Arbitrum One (42161)
- **Repo:** `github.com/youvandra/gathaero` (branch `main`)
- **Remote:** `git@github.com:youvandra/gathaero.git` (public), pushed over SSH

## Current state (4 Oct 2026) — read this first
- **Live:** https://gathaero.space (app, `/kiosk`, `/claim`), verifier at `/verifier/` → VPS `:8790`.
- **v4 on Arbitrum Sepolia**, block 315593229: factory `0x60db695b5aF43e85541a4c14b2c1153e0e39628c`,
  lens `0x8b94491963722C45DaEF93aEFb096b3b8c13c262`, registry `0xDBff899A166482DbC7d8A008D35386a1E7c33737`,
  passes `0xB22e740E4f6A62cb49404A1dF4f4CcB0CB707d81`, feeder `0x87911883D88dF3B482A23D659538ed4C45b4A263`,
  oracle `0x93166cf054834e55A6df3568a8CbB46a486D37eB`, receiver `0x74E4b0F472d1fcd3B9052899cB9C14Dc0D0d91f9`,
  USDG (unchanged from v3) `0xA50d9454E71aCf152399C872815ae6895cB53229`.
- v4 adds: `seed()` (operator opens pools as liquidity, cannot trade), `redeemFor`/`refundFor` (resolver
  pushes payouts), per-flight 200 USDG cap in `PassRegistry`, `resolveVoid` blocked after a final arrival
  and open to anyone after 3 days, receiver requires a workflow owner, `resolver()` follows factory owner.
- **VPS:** `~/gathaero-feeder` = v4 (verifier + resolver), `~/gathaero-feeder-v3` = v3 resolver only.
  `gathaero-resolver` runs `~/run-resolvers.sh`: v4 one-shot then v3 one-shot, every 10 min, one key.
  Kiosk emails and payout markers live in `/home/ubuntu/gathaero-data` (mode 700).
- Result emails go through Resend once `RESEND_API_KEY` is in the VPS `.env`; until then they are
  written to `gathaero-data/outbox`.
- Local env backups: `feeder/.env.v3`, `app/.env.v3`.

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
- Trading (`buy`, `seed`, `addLiquidity`) closes at `scheduledDeparture`; resolution has no time gate.
- `addLiquidity` is proportional (FPMM style): price never moves, the surplus outcome tokens go back
  to the LP, and each LP's principal is tracked so a void returns exactly what they put in.
- `buy(outcome, amount, minSharesOut)` reverts on slippage; the app passes quote − 1%.
- A finalized resolution can't be overwritten. `FlightOracleReceiver` refuses every report until
  `setWorkflowOwner` is called, then accepts only that owner's workflow.
- `Bought` event carries `delayedProbability` → price history without an indexer.

Tests: `forge test` → **49 pass** (48 unit + solvency fuzz, compiled with `via_ir`).

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
  markets (edge windows open-ended) and opens each with `seed(liquidity, probability)`. With `RAPIDAPI_KEY` the schedule/route come
  from AeroDataBox; otherwise from the JSON.
- `npm run resolve` — for flights past arrival + grace: AeroDataBox `Arrived` → feed delay + resolve all
  markets; `Canceled`/`Diverted` → void. Then `payouts.ts` pushes `redeemFor`/`refundFor` to every
  buyer and emails kiosk subscribers through Resend. `--watch` repeats every 10 min.
- Delay = actual arrival − scheduled arrival from the on-chain registry. Actual arrival is
  AeroDataBox `revisedTime` (gate arrival, the airline on-time standard), falling back to
  `runwayTime` (touchdown). With neither, the flight stays pending and is retried.
- Manual: `npm run resolve -- SQ956 2026-10-04 75` or `... void`.

## Deploy runbook (Arbitrum Sepolia)
```
cd contracts && forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --private-key $KEY --broadcast
# copy addresses into feeder/.env and app/.env (VITE_DEPLOY_BLOCK = deploy block)
cd feeder && npm run list && npm run resolve -- --watch
```
Verified end-to-end on local anvil: seed → pass → buy → resolve delayed → payout pushed → email written.

## Earlier deployments
v1 (no pass gating), v2 (block `315254447`, gated only the Delayed side) and v3 (factory
`0xeD2c783B0037567c1f0ddf221cCb7649d185C4eF`, block `315275472`) stay on-chain. The v4 addresses are
at the top of this file and in the README.

## Boarding pass (insurable interest)
- Every side of every market reverts `NotPassenger` unless `PassRegistry.isPassenger(flightId,
  msg.sender)`, with no operator exception. `PassRegistry.staked` caps each passenger at 200 USDG
  per flight.
- Flow: app scans the IATA BCBP barcode (camera or photo) → `POST {VITE_VERIFIER_URL}/passes`
  → verifier checks flight number, route and day against the on-chain registry and returns an
  EIP-712 `Pass(flightId, wallet, passHash, expiry)` signature → the user calls
  `PassRegistry.register` from their wallet. `passHash = keccak(flightId, bookingRef, name)`;
  one pass binds to one wallet; signatures expire after 15 minutes.
- Not covered: BCBP barcodes are unsigned, so a forged barcode for a real flight still passes.
  Closing that needs an airline/PNR lookup.
- Verifier runs on the VPS as `gathaero-verifier` on `:8790`, behind nginx at
  `https://gathaero.space/verifier/` (`/passes`, `/notify` for result emails).
- Testnet: `/demo-pass` and the market page's Use a demo pass generate a fresh BCBP for any open
  flight, so testers without a real pass can try the flow.

Deployer/operator `0x9F846D2054689a439DA8D0619f37F6c70Db03597`.
20 real SIN departures listed on v4 from AeroDataBox (4–5 Oct).
The resolver runs on the VPS as systemd unit `gathaero-resolver` (`~/run-resolvers.sh`, `.env` mode 600,
MemoryMax 400M, Restart=always). Logs: `journalctl -u gathaero-resolver -f`. To update: rsync `feeder/`
(without `node_modules`/`.env`) then `sudo systemctl restart gathaero-resolver`. Never run a second
resolver with the same key — concurrent nonces collide.

## Not done yet
- CRE workflow typechecks against cre-sdk 1.23 but has not been simulated or deployed to a DON; it
  re-reports landed flights each run (the oracle rejects the duplicate) — add a finalized read first.
- `cordon-ui` is a `file:../../cordon-ui` dependency outside this repo: build locally and upload
  `app/dist/`; nginx rewrites unknown paths to `index.html`.
- No sell/exit before settlement (the market maker has no `sell`).
- Listing is manual (`npm run list` from a machine with the operator key, resolver stopped meanwhile).
- Boarding passes are unsigned by airlines; passes cannot be revoked.
