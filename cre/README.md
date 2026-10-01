# Skyasa CRE workflow

Chainlink Runtime Environment (CRE) workflow that reads flight status from
AeroDataBox and writes a signed report to `FlightOracleReceiver` on Arbitrum.

## Flow
```
cron (*/30) -> http GET AeroDataBox -> encode (bytes32 flightId, int32 delay, bool finalized)
  -> runtime.report -> evmClient.writeReport -> FlightOracleReceiver.onReport
  -> FlightOracleConsumer.postResolution
```

## Requirements
- CRE CLI `>= v1.30.0` (Arbitrum Testnet support).
- Deploy access enabled for the organization.
- `RAPIDAPI_KEY` secret (AeroDataBox key via RapidAPI).

## Setup
```
npm install
cre login
cre workflow supported-chains          # confirm Arbitrum Testnet + get chain selector
cre secrets create RAPIDAPI_KEY
cre workflow simulate
cre workflow deploy
```

Fill `config.json` with the Arbitrum Testnet chain selector and the deployed
`FlightOracleReceiver` address. Set `receiverAddress` as a reporter on
`FlightOracleConsumer` (`setReporter(receiver, true)`).

If CRE is unavailable, the Node feeder in `../feeder` posts to the same
consumer through `MockFeeder` and is used for demos.
