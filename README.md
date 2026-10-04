<p align="center"><img src="docs/assets/banner.png" alt="Gathæro: trade your own flight" width="100%"></p>

# Gathæro

**Trade your own flight.** Gathæro is a flight market on Arbitrum that only the
people on board can use. A traveller scans their boarding pass, the pass is
linked to their wallet on-chain, and they can **protect** against a delay or
**predict** the arrival time. Every market settles in USDG from the flight's real
gate arrival, and winnings are sent to the winner's wallet automatically: there is
nothing to claim.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636)](contracts)
[![Foundry](https://img.shields.io/badge/Foundry-49%20tests%20passing-2f855a)](#testing)
[![Arbitrum Sepolia](https://img.shields.io/badge/Arbitrum%20Sepolia-421614-28A0F0)](https://sepolia.arbiscan.io/address/0x60db695b5aF43e85541a4c14b2c1153e0e39628c)
[![USDG](https://img.shields.io/badge/settles%20in-USDG-0B6E4F)](#tech-stack)
[![Chainlink CRE](https://img.shields.io/badge/Chainlink-CRE%20workflow-375BD2)](cre)
[![React](https://img.shields.io/badge/React-19-149ECA)](app)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](app/tsconfig.json)
[![Licence](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

| | |
|---|---|
| **The app** | <https://gathaero.space> |
| **Kiosk mode, as a gate screen would show it** | <https://gathaero.space/kiosk> |
| **A demo boarding pass, for testers without a flight** | <https://gathaero.space/demo-pass> |
| **The market factory, on Arbiscan** | [`0x60db…628c`](https://sepolia.arbiscan.io/address/0x60db695b5aF43e85541a4c14b2c1153e0e39628c) |
| **A real flight, settled from real data** | [AK714 SIN→KUL, 3 Oct, 5 min late, settled On time](https://sepolia.arbiscan.io/tx/0x43736bfe1a69ea6c388eed67e33b94e395175def81ad14df2e072deffca836c0) |

---

## Built during the buildathon

Gathæro is entered at the **Arbitrum Open House Singapore** online buildathon.
The repository was created on 1 October 2026 and every commit in it was written
during the event, so the whole history is the entry:

```bash
git log --reverse --format="%ad %s" --date=short
```

**Built at the event:** the contracts, the boarding pass verifier, the listing
and settlement services, the Chainlink CRE workflow, the web app, the kiosk
mode, and four deployments to Arbitrum Sepolia.

**Reused:** open-source libraries (OpenZeppelin, viem, wagmi, zxing) and a
private UI component library written before the event, which the app imports as
a local package.

---

## Contents

[Overview](#overview) · [The solution](#the-solution) ·
[One flight, end to end](#one-flight-end-to-end) · [Architecture](#architecture) ·
[The rules](#the-rules-and-where-each-one-lives) · [Markets and pricing](#markets-and-pricing) ·
[Settlement](#settlement) · [Boarding pass verification](#boarding-pass-verification) ·
[Kiosk mode](#kiosk-mode) · [What is deployed](#what-is-deployed) ·
[Quick start](#quick-start) · [What this does not claim](#what-this-does-not-claim) ·
[Security review](#security-review) ·
[Tech stack](#tech-stack) · [Partner technology](#partner-technology) ·
[Repository structure](#repository-structure) · [Testing](#testing) ·
[Running it](#running-it) · [Roadmap](#roadmap) · [Licence](#licence)

---

## Overview

About one in four flights on Southeast Asia's largest airlines arrives late. In
May 2025 Singapore Airlines arrived within 15 minutes of schedule 76.3% of the
time, AirAsia 77.0% and Garuda Indonesia 81.1% (Cirium). When a flight is late,
the traveller pays for it: the extra meal, the missed transfer, the night in a
hotel. Travel insurance pays back weeks later, after a claim form and proof of
delay.

Prediction markets showed there is demand to price flights. In July 2026 Kalshi
opened markets on flight cancellations to anyone; within weeks FlightAware sued,
warning that such markets give people a reason to disrupt flights. An open
market on a flight invites exactly the people who can influence it.

**Gathæro is a flight market that only the people on board can trade.** Each
flight gets its own pools, every trader is a verified passenger of that flight,
trading closes at departure, and the outcome comes from the flight's actual gate
arrival.

---

## The solution

- A flight is **listed** with its real schedule from AeroDataBox: departure,
  arrival, route, and a delay threshold of 30 minutes.
- A traveller **scans their boarding pass**. A verifier checks the flight
  number, route and date against the on-chain schedule and signs an EIP-712
  attestation for that traveller's wallet.
- The traveller **registers the pass** in `PassRegistry` with one transaction.
  From then on that wallet is a passenger of that flight, and the pass can never
  be used by another wallet.
- The passenger trades their flight in two ways:
  - **Protect:** buy the Delayed side of the protection pool at the market's
    live delay probability, as a hedge against a late arrival.
  - **Predict:** trade Yes or No on arrival windows, for example "arrives 10 to
    30 minutes late", and back their own read of the flight.
- **Trading closes at scheduled departure**, before anyone can see the arrival
  coming.
- About **30 minutes after arrival** the resolver reads the gate arrival, writes
  the delay on-chain once, and settles every market for that flight.
- If the flight was more than 30 minutes late, protection **pays 1 USDG per share**.
  Liquidity providers keep the premiums when it was on time.

> Insurance asks you to prove a loss. Gathæro pays on the flight's public
> arrival time, which nobody on board can change.

---

## One flight, end to end

| When | What happens | Where |
|---|---|---|
| Day before | Listing reads the schedule and registers the flight, then opens a protection pool and four arrival-window pools, seeded with opening odds | `feeder/src/listing.ts` → `FlightRegistry.registerFlight`, `MarketFactory.createProtection`, `createRange`, `FlightMarket.seed` |
| At the gate | Traveller scans the boarding pass; verifier signs `Pass(flightId, wallet, passHash, expiry)` | `feeder/src/verifier.ts` |
| At the gate | Traveller registers the pass | `PassRegistry.register` |
| Before departure | Traveller buys protection or a window | `FlightMarket.buy` |
| Scheduled departure | Every market for the flight stops trading | `FlightMarket.isTrading` |
| Arrival + 30 min | Resolver reads AeroDataBox; when the flight is `Arrived`, it writes the delay | `feeder/src/resolve.ts` → `MockFeeder.feed` → `FlightOracleConsumer` |
| Same transaction batch | Each market resolves against the recorded delay | `FlightMarket.resolve` |
| Right after | The resolver pushes every payout and refund to the buyer's wallet, then emails anyone who left an address at the kiosk | `feeder/src/payouts.ts` → `FlightMarket.redeemFor`, `refundFor` |
| Any time after | LPs withdraw | `FlightMarket.removeLiquidity` |

---

## Architecture

```mermaid
flowchart LR
  subgraph Off-chain
    App[Web app and kiosk]
    Verifier[Pass verifier]
    Lister[Listing service]
    Resolver[Resolver]
    CRE[Chainlink CRE workflow]
    ADB[(AeroDataBox)]
    Mail[(Resend email)]
  end
  subgraph Arbitrum
    FR[FlightRegistry]
    PR[PassRegistry]
    MF[MarketFactory]
    FM[FlightMarket pools]
    OC[FlightOracleConsumer]
    RX[FlightOracleReceiver]
    MFd[MockFeeder]
    ML[MarketLens]
  end
  App -- barcode --> Verifier
  Verifier -- reads schedule --> FR
  Verifier -- EIP-712 signature --> App
  App -- register --> PR
  App -- buy --> FM
  FM -- isPassenger --> PR
  Lister -- schedule --> ADB
  Lister --> FR
  Lister --> MF
  MF -- deploys --> FM
  Resolver -- arrival --> ADB
  Resolver --> MFd --> OC
  Resolver -- redeemFor / refundFor --> FM
  Resolver -- result --> Mail
  FM -- recordStake --> PR
  CRE -- arrival, node consensus --> ADB
  CRE --> RX --> OC
  FM -- resolution --> OC
  App -- reads --> ML
```

| Contract | Job |
|---|---|
| `FlightRegistry` | Schedules: number, route, scheduled departure and arrival, delay threshold. Written once per flight. |
| `PassRegistry` | Which wallet is a passenger of which flight, which wallet holds each boarding pass, and how much each passenger has staked on their flight. |
| `MarketFactory` | Deploys one protection pool and any number of arrival-window pools per flight. |
| `FlightMarket` | A fixed-product market maker over two outcomes: seeded opening odds, proportional liquidity, the passenger gate, and payouts anyone can push to the holder. |
| `OutcomeToken` | ERC-1155 shares for On time and Delayed, one token contract per market, non-transferable between wallets. |
| `FlightOracleConsumer` | The delay of each flight, written once and then final. |
| `FlightOracleReceiver` | The Chainlink CRE entry point; accepts reports only from the configured workflow owner. |
| `MockFeeder` | The resolver's reporter while CRE is not deployed. |
| `MarketLens` | One call for every flight and its markets, and one for a wallet's positions. |

---

## The rules, and where each one lives

| Rule | Enforced in | Refusal |
|---|---|---|
| Only verified passengers of a flight can buy on its markets | `FlightMarket.buy` → `PassRegistry.isPassenger` | `NotPassenger` |
| A boarding pass links to one wallet | `PassRegistry.register`, `holderOf[passHash]` | `PassAlreadyUsed` |
| An attestation works only for the wallet it was signed for, and only for 15 minutes | EIP-712 `Pass(flightId, wallet, passHash, expiry)` | `Unauthorized`, `PassExpired` |
| A wallet can put at most 200 USDG on one flight, across all its markets | `PassRegistry.MAX_STAKE`, `staked[flightId][wallet]`, written only by listed markets | `StakeLimitExceeded` |
| Payouts and refunds can only go to the holder, whoever sends them | `FlightMarket.redeemFor`, `refundFor` | — |
| The operator opens a pool as liquidity at a chosen probability, once, and never trades | `FlightMarket.seed`, once, operator only | `MarketAlreadySeeded` |
| A flight with a final arrival time cannot be voided; an unreported one can be voided by anyone after 3 days | `FlightMarket.resolveVoid`, `VOID_GRACE` | `ResolutionFinal`, `Unauthorized` |
| Positions stay with the wallet that bought them | `OutcomeToken._update` | `NotTransferable` |
| Trading closes at scheduled departure | `FlightMarket.scheduledDeparture` | `MarketClosed` |
| A flight's delay is recorded once | `FlightOracleConsumer` | `AlreadyFinalized` |
| A new LP cannot move the price | proportional add, excess shares returned to the LP | — |

The passenger rule has no exceptions: the operator opens each pool with
`seed`, a liquidity deposit at a chosen probability, and never trades.

---

## Markets and pricing

Every market holds reserves of two outcome shares, On time and Delayed, and
prices them with a constant product. The price of Delayed is the market's delay
probability, so a passenger buying protection at 14% receives roughly 7 shares
per dollar, and each share pays 1 USDG if the flight is late.

- **Protection pool**, one per flight: Delayed wins when the flight arrives more
  than `delayThresholdMinutes` (30) after its scheduled arrival.
- **Arrival windows**, four per flight by default (earlier than −5, −5 to 10,
  10 to 30, and later than 30 minutes against schedule): Yes wins when the gate
  arrival falls inside the window. The first and last windows are open-ended, so
  every arrival lands in exactly one window.
- **Liquidity** is added in proportion to the pool, so a second LP never moves
  the odds. Each LP's principal is tracked, and a voided market returns it in
  full.
- **Opening odds** come from each route's on-time history and are set by
  `seed`, which deposits the operator's liquidity at that probability as in
  Gnosis's FPMM. The operator holds no trade, and only passengers move the price.

---

## Settlement

**Delay is the actual arrival minus the scheduled arrival recorded on-chain at
listing.** The actual arrival is AeroDataBox `revisedTime`, which is the gate
arrival and the time airlines report on-time performance against, falling back
to `runwayTime` (touchdown). A flight settles only once AeroDataBox reports it
`Arrived` with one of those times; until then it stays pending and is retried
every ten minutes.

- Arrived more than 30 minutes late: Delayed wins and protection pays.
- Arrived 30 minutes late or less: On time wins and LPs keep the premiums.
- `Canceled` or `Diverted`: every market for the flight is voided and every
  premium and LP principal is refunded.

The resolver waits 30 minutes after scheduled arrival before it looks, so a
typical payout is final about half an hour after the flight reaches the gate.

**Nobody claims.** Once every market for a flight has settled, the resolver
reads each market's `Bought` events and calls `redeemFor(holder)` for every
winner, or `refundFor(holder)` after a void. Both functions are open to anyone
and can only pay the holder, so the operator cannot redirect a cent and anyone
can push a payout the operator missed. `redeem` and `refund` remain for a
holder who wants to collect first.

**Results by email.** A traveller can leave an email at the kiosk. The verifier
stores it off-chain, one file per wallet and flight, only after the boarding
pass checks out. When the flight settles the resolver sends the result (landed
time, each position, what was paid, the Arbiscan link) through Resend and then
deletes the address.

---

## Boarding pass verification

The barcode on every boarding pass is an IATA BCBP string. Gathæro reads it
with zxing (PDF417, Aztec and QR) from the camera or a photo, and parses the
fixed-width fields: passenger name, booking reference, origin, destination,
carrier and flight number, day of year and seat.

The verifier (`feeder/src/verifier.ts`) then:

1. reads the flight from `FlightRegistry` and checks the flight number, the
   route and the departure day against the pass;
2. refuses a pass already linked to another wallet, and a wallet already
   verified for that flight, before anything reaches the chain;
3. computes `passHash = keccak256(flightId, bookingReference, passenger)`, so
   no name or booking reference is ever stored on-chain;
4. signs `Pass(flightId, wallet, passHash, expiry)` with EIP-712, valid for 15
   minutes.

The traveller submits that signature to `PassRegistry.register` from their own
wallet. The registry checks the signer, the expiry, and that the pass is not
already held by another wallet.

---

## Kiosk mode

`/kiosk` is the screen an airport would put at the gate. It never holds a
wallet.

1. The traveller chooses Protect or Trade my flight, then scans their boarding
   pass. The kiosk finds the flight's open market.
2. On the kiosk screen they pick the amount, and for a trade the arrival window.
3. They show the Receive QR code from their wallet app, or type the address,
   and can leave an email for the result.
4. The verifier signs the pass for that address, and the kiosk shows a QR code
   that carries their choice.
5. They scan it with their phone. `/claim` opens in the wallet's browser with
   the choice filled in; they link the pass and confirm, signing on their own
   device.
6. After landing the payout arrives in their wallet and the result arrives by
   email. They never open the app again.

The hand-off QR carries the flight id, the pass hash, the expiry and the
signature. It carries no name and no booking reference. The kiosk clears itself
when the code expires or after three idle minutes.

---

## What is deployed

Arbitrum Sepolia, chain **421614**. v4, deployed in block `315593229`.

| Contract | Address |
|---|---|
| `MarketFactory` | [`0x60db695b5aF43e85541a4c14b2c1153e0e39628c`](https://sepolia.arbiscan.io/address/0x60db695b5aF43e85541a4c14b2c1153e0e39628c) |
| `FlightRegistry` | [`0xDBff899A166482DbC7d8A008D35386a1E7c33737`](https://sepolia.arbiscan.io/address/0xDBff899A166482DbC7d8A008D35386a1E7c33737) |
| `PassRegistry` | [`0xB22e740E4f6A62cb49404A1dF4f4CcB0CB707d81`](https://sepolia.arbiscan.io/address/0xB22e740E4f6A62cb49404A1dF4f4CcB0CB707d81) |
| `FlightOracleConsumer` | [`0x93166cf054834e55A6df3568a8CbB46a486D37eB`](https://sepolia.arbiscan.io/address/0x93166cf054834e55A6df3568a8CbB46a486D37eB) |
| `FlightOracleReceiver` | [`0x74E4b0F472d1fcd3B9052899cB9C14Dc0D0d91f9`](https://sepolia.arbiscan.io/address/0x74E4b0F472d1fcd3B9052899cB9C14Dc0D0d91f9) |
| `MockFeeder` | [`0x87911883D88dF3B482A23D659538ed4C45b4A263`](https://sepolia.arbiscan.io/address/0x87911883D88dF3B482A23D659538ed4C45b4A263) |
| `MarketLens` | [`0x8b94491963722C45DaEF93aEFb096b3b8c13c262`](https://sepolia.arbiscan.io/address/0x8b94491963722C45DaEF93aEFb096b3b8c13c262) |
| Test USDG (6 decimals, open mint) | [`0xA50d9454E71aCf152399C872815ae6895cB53229`](https://sepolia.arbiscan.io/address/0xA50d9454E71aCf152399C872815ae6895cB53229) |

The verifier signs from `0x7A5d66675fc1f54E090aEf404832788430e88e97`, an
address that holds no funds. Every flight's pools are listed by
`MarketLens.flights()`, and each market's address is shown in the app's
Contracts panel.

Earlier deployments are kept on-chain and no longer used by the app: v1 had no
passenger rule, v2 gated only the Delayed side of protection, and v3 (factory
`0xeD2c783B0037567c1f0ddf221cCb7649d185C4eF`) still needed a claim, let the
operator seed by trading and capped stakes per market. Its last flights settle
on 4 October. The first
real settlement happened on v2: AirAsia AK714 on 3 October arrived 5 minutes
late at the gate and settled On time
([tx](https://sepolia.arbiscan.io/tx/0x43736bfe1a69ea6c388eed67e33b94e395175def81ad14df2e072deffca836c0)).

---

## Quick start

### Try it, no install

1. Open <https://gathaero.space> and connect a wallet on Arbitrum Sepolia. You
   need a little Sepolia ETH for gas.
2. Tap your USDG balance in the top bar to mint test USDG.
3. Open a flight that is still open (buying closes at departure) and tap
   **Verify boarding pass**. No boarding pass? Tap **Use a demo pass**: on
   testnet it generates a real-format pass for that flight with a random name.
   Confirm the transaction that links it to your wallet.
4. Buy protection or an arrival window. Your position, its contract and the
   flight's actual arrival appear under **Positions**; after landing the payout
   arrives in your wallet and shows there as paid.
5. To try the kiosk, open <https://gathaero.space/demo-pass> on one screen and
   <https://gathaero.space/kiosk> on another, and scan the demo pass.

### Run it locally

```bash
cd contracts && forge build && forge test
cd app && npm install && cp .env.example .env && npm run dev
cd feeder && npm install && cp .env.example .env && npm run list
```

The app reads the addresses above from `app/.env`; see
[Running it](#running-it) for every variable.

---

## What this does not claim

- **A boarding pass barcode is not signed by the airline.** Anyone can generate
  a well-formed barcode for a real flight, so a determined forger can pass the
  verifier. The stake cap and one-pass-per-wallet limit the damage; checking the
  booking with the airline closes it. On testnet the app makes this explicit
  with a demo pass generator, so anyone can try the flow; mainnet would remove
  it and check bookings instead.
- **One resolver reports arrivals today, and it is also the liquidity.** The
  operator key that lists markets also feeds the delay through `MockFeeder`, and
  it seeded every pool. Seeding leaves it balanced, but as passengers buy, the
  pool takes the other side, so the operator ends up exposed to the outcome it
  reports. The arrival comes from AeroDataBox and anyone can check it against
  public flight data, but the report is still trusted. The fix is to split the
  two roles: the Chainlink CRE workflow, written and typechecked but not yet
  deployed to a DON, takes over reporting, and outside liquidity providers take
  over seeding through the vault.
- **Passes cannot be revoked.** A pass found to be forged after registration
  keeps its place; revocation would come with an airline partner.
- **Result emails depend on an off-chain service.** Addresses are kept only on
  the operator's server until the flight settles. Payouts do not depend on
  them.
- **A cancellation refunds; it does not pay.** Cancelled and diverted flights
  void their markets. A separate cancellation market would cover them.
- **The collateral is a test token.** Paxos testnet USDG has no public faucet,
  so the testnet uses a 6-decimal mock with an open mint. Mainnet uses Paxos
  USDG.
- **No fee is charged yet.** The revenue model (trading fee, checkout API, vault
  fee, data) switches on at mainnet.

---

## Security review

A self-review of every contract in `contracts/src`, done on 4 October 2026
against v3. No finding let an outside party take funds, and every finding is
fixed in v4, with a test for each fix. The solvency fuzz test (see
[Testing](#testing)) backs the accounting: across random sequences of seeding,
liquidity, trades, settlement and voids, every holder is paid by a pushed
payout and only rounding dust stays behind.

**What holds up**

- The market maker keeps complete sets: every USDG in mints one On time and one
  Delayed token, and every USDG out burns one winning token.
- Rounding favours the pool; checks-effects-interactions with `nonReentrant` and
  `SafeERC20` on every transfer.
- Pass signatures are EIP-712, bound to the caller's wallet and the chain, so a
  signature cannot be replayed or used by another wallet.
- Arrival data is write-once, positions are non-transferable, and every revert is
  a custom error.

**Findings on v3, and the fix in v4**

| # | Severity | Finding on v3 | Fixed in v4 |
|---|---|---|---|
| 1 | Medium | The operator seeded opening odds with a trade, exempt from the pass and the stake cap, while the same key reports arrivals. | `seed(amount, probability)` opens the pool as liquidity, once, operator only. The exemption is gone: the operator cannot trade. |
| 2 | Medium | `resolveVoid` stayed callable after the oracle had finalized, so the operator could void a settled outcome. | `resolveVoid` reverts with `ResolutionFinal` once the arrival time is final. |
| 3 | Medium | A market whose arrival was never reported waited on the operator to void it. | Anyone can void from `scheduledArrival + VOID_GRACE` (3 days). |
| 4 | Low | The 200 USDG cap applied per market, so one wallet could stake across every market of a flight. | `PassRegistry.staked[flightId][wallet]` caps the whole flight; only listed markets can write it. |
| 5 | Low | Windows covered −20 to +60 minutes; an arrival outside resolved every window to No. | The first and last windows are open-ended. |
| 6 | Low | `FlightOracleReceiver` accepted any workflow while `workflowOwner` was unset. | Reports are refused until a workflow owner is set. |
| 7 | Low | Seeding took two transactions, so a passenger could buy at 50/50 in between. | `addLiquidity` reverts until the pool is seeded. |
| 8 | Info | Each market kept the factory owner at creation as its resolver. | `resolver()` reads the factory's current owner. |

Still open, and stated in [What this does not claim](#what-this-does-not-claim):
unsigned boarding pass barcodes, a single resolver until Chainlink CRE is
deployed, and passes that cannot be revoked.

---

## Tech stack

| Layer | Technology | Why this one |
|---|---|---|
| Contracts | Solidity 0.8.28, Foundry, `via_ir` | custom errors, events on every state change, no proxies and no upgrade path |
| Chain | Arbitrum Sepolia (421614), Arbitrum One for mainnet | a $5 protection only makes sense when a trade costs cents and confirms in about a second |
| Money | USDG (Paxos), 6 decimals | travellers think in dollars; payouts land as a stablecoin they can spend |
| Flight data | AeroDataBox via RapidAPI | scheduled, revised (gate) and runway times for every leg, including cancellations and diversions |
| Oracle | Resolver today, Chainlink CRE workflow (`@chainlink/cre-sdk` 1.23) next | CRE fetches AeroDataBox on many nodes and only reports what they agree on |
| Services | Node, TypeScript, viem 2 | listing, resolver and verifier share one ABI file generated from the contracts |
| Barcode | `@zxing/browser` | reads PDF417, Aztec and QR from a camera or a photo, in the browser |
| App | React 19, Vite, wagmi 3, TanStack Query, Tailwind, PWA | installable on a phone, works in a wallet's in-app browser |
| Hosting | nginx and Let's Encrypt on a VPS, systemd for the resolver and verifier | the app and the verifier share one HTTPS origin |

### Standards

**EIP-712** for the boarding pass attestation · **ERC-1155** for outcome shares
· **ERC-20** for collateral · **IATA BCBP** (Resolution 792) for the boarding
pass barcode.

---

## Partner technology

| OpenZeppelin | Where |
|---|---|
| `ERC1155` | `OutcomeToken`, with `_update` overridden to keep positions with their buyer |
| `EIP712`, `ECDSA` | `PassRegistry` verifies the verifier's signature over `Pass(flightId, wallet, passHash, expiry)` |
| `SafeERC20`, `IERC20` | every collateral transfer in `FlightMarket` |
| `ReentrancyGuard` | `buy`, `seed`, `addLiquidity`, `removeLiquidity`, `resolve`, `redeem`, `redeemFor`, `refund`, `refundFor` |
| `Ownable` | `FlightRegistry`, `PassRegistry`, `MarketFactory` (whose owner is every market's resolver), `FlightOracleConsumer`, `FlightOracleReceiver`, `MockFeeder` |
| `ERC20` | the testnet USDG mock |

| Paxos USDG | Where |
|---|---|
| Collateral and payout asset | every market is denominated in USDG; a share pays 1 USDG |
| Testnet | a 6-decimal mock with an open mint stands in, because Paxos testnet USDG has no public faucet; `Deploy.s.sol` takes `COLLATERAL` to point at real USDG |

| Chainlink | Where |
|---|---|
| CRE workflow | `cre/main.ts`: a cron trigger, `HTTPClient` with identical-response consensus over AeroDataBox, and `EVMClient.writeReport` to `FlightOracleReceiver` |

**Not used:** GMX, Robinhood Chain, Dune, ZeroDev, Fhenix, Alchemy and AWS.

---

## Repository structure

```
contracts/          Foundry project
  src/registry/     FlightRegistry, PassRegistry
  src/market/       MarketFactory, FlightMarket
  src/tokens/       OutcomeToken
  src/oracle/       FlightOracleConsumer, FlightOracleReceiver, MockFeeder
  src/lens/         MarketLens
  src/interfaces/   IFlightRegistry, IFlightOracle, IPassRegistry
  src/lib/          Errors
  test/             48 unit tests + solvency fuzz
  script/           Deploy.s.sol, export-abis.sh
feeder/             Node services
  src/listing.ts    lists flights and seeds markets
  src/resolve.ts    settles flights from AeroDataBox (--watch to loop)
  src/payouts.ts    pushes payouts and refunds, then emails results
  src/subscribers.ts  kiosk emails, off-chain, deleted after use
  src/verifier.ts   boarding pass verifier, HTTP on VERIFIER_PORT
  src/bcbp.ts       IATA BCBP parser
  src/flights.json  flights to list
cre/                Chainlink CRE workflow
app/                web app (Vite, React, PWA)
  src/pages/        landing, app, kiosk, claim, demo pass
  src/features/     market, boarding, positions, vault, kiosk, wallet
docs/               status, day-one spec, README banner
```

---

## Testing

```bash
cd contracts && forge test
forge test --match-contract Solvency --fuzz-runs 5000
```

| Suite | Tests | Covers |
|---|---|---|
| `FlightMarket.t.sol` | 28 | buying, seeding, liquidity in proportion, slippage, departure close, resolution, pushed payouts and refunds, voids after a final arrival and after the grace period, resolver following factory ownership, ranges and thresholds |
| `PassRegistry.t.sol` | 13 | passenger gate on every side and market, the operator included, signature bound to wallet, one pass one wallet, expiry, the 200 USDG cap across a flight, only listed markets record stakes, non-transferable positions |
| `FlightOracleReceiver.t.sol` | 4 | CRE reports refused until a workflow owner is set, then accepted only from it |
| `MarketLens.t.sol` | 3 | flight and position views |
| `Solvency.t.sol` | 1 fuzz | random seeding, deposits and trades, then settle or void: every holder is paid by `redeemFor` or `refundFor` and the market never owes more than it holds (5,000 runs) |

The payout flow was also run end to end on a local chain: a passenger bought
protection and a window, the resolver settled the flight 45 minutes late, pushed
216.67 USDG to the passenger's wallet and wrote their result email.

The app and services typecheck with `tsc --noEmit` under `strict`.

---

## Running it

### Contracts

```bash
cd contracts
VERIFIER=0x... COLLATERAL=0x... forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL --private-key $KEY --broadcast
bash script/export-abis.sh   # regenerates app/src/lib/abi and feeder/src/abi.ts
```

`COLLATERAL` reuses an existing token; leave it unset to deploy the mock.

### Services (`feeder/.env`)

| Variable | Used by |
|---|---|
| `RPC_URL`, `CHAIN_ID` | all |
| `FEEDER_PRIVATE_KEY` | listing and resolver (the operator) |
| `MARKET_FACTORY`, `MARKET_LENS`, `FLIGHT_REGISTRY`, `MOCK_FEEDER_ADDRESS`, `COLLATERAL` | listing and resolver |
| `RAPIDAPI_KEY`, `RAPIDAPI_HOST` | AeroDataBox |
| `LANDED_GRACE_MINUTES` | resolver, default 30 |
| `PASS_REGISTRY`, `VERIFIER_PRIVATE_KEY`, `VERIFIER_PORT` | verifier |
| `DEPLOY_BLOCK` | resolver, where the `Bought` scan for payouts starts |
| `DATA_DIR` | verifier and resolver, where kiosk emails and payout markers live |
| `RESEND_API_KEY`, `MAIL_FROM` | resolver; without a key, result emails are written to `DATA_DIR/outbox` |

```bash
npm run list                  # list flights.json and seed markets
npm run resolve -- --watch    # settle due flights, push payouts, email results, every 10 minutes
npm run verifier              # boarding pass verifier
npm run resolve -- AK714 2026-10-03 5   # settle one flight by hand (minutes or "void")
```

Run one resolver per operator key; two processes with the same key collide on
nonces.

### App (`app/.env`)

`VITE_CHAIN_ID`, `VITE_RPC_URL`, `VITE_MARKET_FACTORY`, `VITE_MARKET_LENS`,
`VITE_COLLATERAL`, `VITE_PASS_REGISTRY`, `VITE_VERIFIER_URL`,
`VITE_DEPLOY_BLOCK` (where the trade history scan starts) and `VITE_FAUCET`.

```bash
npm run dev
npm run build   # static files in dist/, served with an index.html fallback
```

---

## Roadmap

1. **Mainnet** on Arbitrum One with Paxos USDG, with the trading fee switched on.
2. **Chainlink CRE** reporting deployed to a DON, retiring the single resolver.
3. **Booking check** with one airline partner, so a pass is verified against
   the booking itself.
4. **Changi gate kiosks**: scan the pass, tap to buy, finish on the phone.
5. **Cancellation markets**, so a cancelled flight pays its passengers too.

---

## Licence

[MIT](LICENSE). The Solidity sources carry `SPDX-License-Identifier: MIT`.
