# Gathaero CRE workflow

Chainlink Runtime Environment (CRE) workflow that reads flight status from
AeroDataBox and writes a signed report to `FlightOracleReceiver` on Arbitrum.

## Flow
```
cron (config.schedule) -> for each config.flights:
  HTTPClient GET AeroDataBox (identical consensus across nodes)
  -> only when status == "Arrived": encode (bytes32 flightId, int32 delay, bool true)
  -> runtime.report -> EVMClient.writeReport -> FlightOracleReceiver.onReport
  -> FlightOracleConsumer.postResolution (a finalized resolution cannot be overwritten)
```
Typechecked against `@chainlink/cre-sdk` 1.23; not yet simulated with the CRE CLI.

## Requirements
- CRE CLI `>= v1.0.0` (Arbitrum Sepolia support).
- Deploy access enabled for the organization.
- `RAPIDAPI_KEY` secret (AeroDataBox key via RapidAPI).

## Setup
```
npm install
cre login
cre workflow supported-chains          # confirm Arbitrum Sepolia + get chain selector
cre secrets create RAPIDAPI_KEY
cre workflow simulate
cre workflow deploy
```

`config.json` holds the v4 `FlightOracleReceiver` address and the flights to watch
(`chainSelectorName` is already `ethereum-testnet-sepolia-arbitrum-1`). On the receiver, call
`setForwarder(<CRE forwarder>)` and `setWorkflowOwner(<your CRE workflow owner>)`. The receiver
refuses every report until a workflow owner is set, then accepts only that owner's workflow.

Each flight entry takes the local departure `date` it was listed under and, optionally, its
`route` (`SIN-KUL`); the workflow uses both to pick the right leg when a flight number flies on
adjacent days, the same rule as `feeder/src/aerodatabox.ts`. Cancelled and diverted flights are
left to the resolver, or to anyone after the market's three-day grace period.

If CRE is unavailable, the Node feeder in `../feeder` posts to the same
consumer through `MockFeeder` and is used for demos.
