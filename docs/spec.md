# Gathæro — day-one spec

The plan written on 1 October 2026, before any code. It is kept to show how the
design moved; the [README](../README.md) describes what is built and deployed.

## The idea
An on-chain market on the risk of a flight being late. Travellers hedge a
delay; others take the other side. Settled from real flight data on Arbitrum,
installable as a PWA, with the blockchain kept out of the way.

## Planned pieces
| Piece | Plan |
|---|---|
| Collateral | A stablecoin; each winning share pays 1 unit |
| Positions | ERC-1155 outcome shares per flight (On time / Delayed) |
| Contracts | `FlightRegistry`, `MarketFactory`, `FlightMarket` (two-outcome constant-product AMM), `FlightOracleConsumer`, `FlightOracleReceiver` (Chainlink CRE), `MockFeeder`, `OutcomeToken`, a mock stablecoin |
| Oracle | A Chainlink CRE workflow: cron, HTTP fetch of flight status, node consensus, report to the receiver. `MockFeeder` as the fallback with the same interface |
| Flight data | AeroDataBox via RapidAPI, `GET /flights/number/{number}/{date}`; delay = gate arrival minus scheduled arrival |
| App | Vite, React, TypeScript, Tailwind, wagmi/viem, PWA: landing, public pages, Home, Markets, Positions, Vault |

## Day-one flow
1. A flight is registered and its market created.
2. Liquidity providers deposit.
3. Travellers buy Delayed; others trade.
4. The market stays open until landing.
5. The oracle writes the arrival; the market resolves.
6. Winners redeem; liquidity providers keep the rest.

## Risks noted on day one
- Chainlink CRE deploy access might be gated: keep `MockFeeder` ready.
- Liquidity cold start: seed markets ourselves.
- Real flights cannot be made late on demand: the demo needs a way to show a
  settlement.
- Regulation: protection needs an insurable interest, so only a flight's
  passengers should buy it; a force majeure event should void and refund.

## What changed while building
| Day-one plan | What shipped |
|---|---|
| Anyone could trade any flight | Only verified passengers of a flight can trade it, the operator included (`PassRegistry`, boarding pass + EIP-712) |
| Open until landing | Trading closes at scheduled departure, so nobody trades on what they see at the gate |
| No size limit | 200 USDG per passenger per flight, across every market on it |
| Positions as tradable tokens | Non-transferable, so exposure cannot move to someone not on the flight |
| One delay market per flight | A protection pool plus four arrival-window pools, the edge windows open-ended |
| Operator seeds odds with a trade | `seed()` opens a pool as liquidity at a chosen probability; the operator never trades, though as the liquidity it takes the other side of every trade |
| Winners redeem | The resolver pushes every payout with `redeemFor`; kiosk buyers get their result by email |
| One route (SIN→CGK) | Real Changi departures to Kuala Lumpur, Jakarta, Bali, Bangkok, Manila, Tokyo and more |
| Chainlink CRE as the live oracle | The resolver posts arrivals through `MockFeeder`; the CRE workflow is written and typechecked, not yet deployed |
| Bounties: Paxos, QuickNode, Dune, ZeroDev, Pendle | Paxos USDG as the unit of account (a mock on testnet); the others were not used |
| A web app | Plus a public kiosk mode that holds no wallet and hands off to the traveller's phone |
