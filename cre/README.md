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

Fill `config.json` with the deployed `FlightOracleReceiver` address and the flights to watch
(`chainSelectorName` is already `ethereum-testnet-sepolia-arbitrum-1`). On the receiver, call
`setForwarder(<CRE forwarder>)` and `setWorkflowOwner(<your CRE workflow owner>)` so only this
workflow can post resolutions.

If CRE is unavailable, the Node feeder in `../feeder` posts to the same
consumer through `MockFeeder` and is used for demos.
