// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Script, console2 } from "forge-std/Script.sol";

import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { FlightRegistry } from "../src/registry/FlightRegistry.sol";
import { PassRegistry } from "../src/registry/PassRegistry.sol";
import { FlightOracleConsumer } from "../src/oracle/FlightOracleConsumer.sol";
import { FlightOracleReceiver } from "../src/oracle/FlightOracleReceiver.sol";
import { MockFeeder } from "../src/oracle/MockFeeder.sol";
import { MarketFactory } from "../src/market/MarketFactory.sol";
import { MarketLens } from "../src/lens/MarketLens.sol";

contract Deploy is Script {
    function run() external {
        address owner = vm.envOr("OWNER", msg.sender);
        address collateral = vm.envOr("COLLATERAL", address(0));
        address verifier = vm.envAddress("VERIFIER");

        vm.startBroadcast();

        if (collateral == address(0)) {
            collateral = address(new MockERC20("Global Dollar", "USDG", 6));
        }
        FlightRegistry registry = new FlightRegistry(owner);
        FlightOracleConsumer oracle = new FlightOracleConsumer(owner, owner);
        MockFeeder feeder = new MockFeeder(address(oracle), owner);
        FlightOracleReceiver receiver = new FlightOracleReceiver(owner, address(oracle), owner);
        oracle.setReporter(address(feeder), true);
        oracle.setReporter(address(receiver), true);

        PassRegistry passes = new PassRegistry(owner, verifier);
        MarketFactory factory = new MarketFactory(
            owner,
            collateral,
            address(oracle),
            address(registry),
            address(passes),
            "ipfs://gathaero/{id}.json"
        );
        passes.setMarkets(address(factory));
        MarketLens lens = new MarketLens(factory);

        vm.stopBroadcast();

        console2.log("collateral", collateral);
        console2.log("registry", address(registry));
        console2.log("oracle", address(oracle));
        console2.log("receiver", address(receiver));
        console2.log("feeder", address(feeder));
        console2.log("passes", address(passes));
        console2.log("factory", address(factory));
        console2.log("lens", address(lens));
    }
}
