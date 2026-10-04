# Gathæro contracts

Solidity 0.8.28, Foundry, OpenZeppelin. Compiled with `via_ir`. The project
README has the full rules table, the security review and every deployed
address; this file is the map of this folder.

| Path | What it is |
|---|---|
| `src/registry/FlightRegistry.sol` | Flight schedules, written once per flight by the operator |
| `src/registry/PassRegistry.sol` | Boarding pass to wallet links (EIP-712 from the verifier) and the 200 USDG per-flight stake cap |
| `src/market/MarketFactory.sol` | Deploys a protection pool and arrival-window pools per flight |
| `src/market/FlightMarket.sol` | Fixed-product market maker: `seed`, `buy`, liquidity, `resolve`, `resolveVoid`, `redeem`/`redeemFor`, `refund`/`refundFor` |
| `src/tokens/OutcomeToken.sol` | ERC-1155 On time / Delayed shares, non-transferable between wallets |
| `src/oracle/FlightOracleConsumer.sol` | Write-once arrival store fed by reporters |
| `src/oracle/MockFeeder.sol` | The resolver's reporter today |
| `src/oracle/FlightOracleReceiver.sol` | Chainlink CRE `IReceiver`; refuses reports until a workflow owner is set |
| `src/lens/MarketLens.sol` | One-call views for the app: flights and positions |
| `src/mocks/MockERC20.sol` | Testnet USDG with an open mint |

## Test

```bash
forge test
forge test --match-contract Solvency --fuzz-runs 5000
```

48 unit tests and a solvency fuzz test: every holder is paid after
settlement or a void, and the market never owes more than it holds.

## Deploy

```bash
VERIFIER=<verifier signer> COLLATERAL=<USDG or empty for the mock> \
  forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --private-key $KEY --broadcast
bash script/export-abis.sh   # refresh the ABIs used by app/ and feeder/
```

`Deploy.s.sol` wires the oracle reporters and points `PassRegistry` at the
factory so only listed markets can record stakes.
