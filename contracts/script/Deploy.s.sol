// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Script, console2 } from "forge-std/Script.sol";

import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { FlightRegistry } from "../src/registry/FlightRegistry.sol";
import { FlightOracleConsumer } from "../src/oracle/FlightOracleConsumer.sol";
import { FlightOracleReceiver } from "../src/oracle/FlightOracleReceiver.sol";
import { MockFeeder } from "../src/oracle/MockFeeder.sol";
import { MarketFactory } from "../src/market/MarketFactory.sol";

contract Deploy is Script {
    function run() external {
        address owner = vm.envOr("OWNER", msg.sender);
        uint16 thresholdMinutes = uint16(vm.envOr("DELAY_THRESHOLD_MINUTES", uint256(120)));

        vm.startBroadcast();

        MockERC20 collateral = new MockERC20("USD Coin", "USDC", 6);
        FlightRegistry registry = new FlightRegistry(owner);
        FlightOracleConsumer oracle = new FlightOracleConsumer(owner, owner);
        MockFeeder feeder = new MockFeeder(address(oracle));
        FlightOracleReceiver receiver = new FlightOracleReceiver(owner, address(oracle), owner);
        oracle.setReporter(address(feeder), true);
        oracle.setReporter(address(receiver), true);

        MarketFactory factory = new MarketFactory(
            owner,
            address(collateral),
            address(oracle),
            address(registry),
            "ipfs://gathaero/{id}.json"
        );

        bytes32 flightId = keccak256("SQ956-2026-10-01");
        registry.registerFlight(
            flightId, "SQ956", uint64(block.timestamp + 2 hours), thresholdMinutes
        );
        address market = factory.createProtection(flightId);
        address thresholdMarket =
            factory.createThreshold(flightId, uint64(block.timestamp + 2 hours + 45 minutes));
        address rangeMarket = factory.createRange(
            flightId,
            uint64(block.timestamp + 2 hours + 30 minutes),
            uint64(block.timestamp + 2 hours + 45 minutes)
        );

        vm.stopBroadcast();

        console2.log("collateral", address(collateral));
        console2.log("registry", address(registry));
        console2.log("oracle", address(oracle));
        console2.log("receiver", address(receiver));
        console2.log("feeder", address(feeder));
        console2.log("factory", address(factory));
        console2.log("market", market);
        console2.log("thresholdMarket", thresholdMarket);
        console2.log("rangeMarket", rangeMarket);
    }
}
