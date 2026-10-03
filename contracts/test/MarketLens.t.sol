// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";

import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { FlightRegistry } from "../src/registry/FlightRegistry.sol";
import { FlightOracleConsumer } from "../src/oracle/FlightOracleConsumer.sol";
import { MarketFactory } from "../src/market/MarketFactory.sol";
import { FlightMarket } from "../src/market/FlightMarket.sol";
import { FlightView, MarketLens, PositionView } from "../src/lens/MarketLens.sol";
import { MarketKind, Outcome } from "../src/types/FlightTypes.sol";

contract MarketLensTest is Test {
    uint256 internal constant UNIT = 1e6;

    MockERC20 internal usdg;
    FlightRegistry internal registry;
    FlightOracleConsumer internal oracle;
    MarketFactory internal factory;
    MarketLens internal lens;

    bytes32 internal flightId = keccak256("SQ956-2026-10-04");
    uint64 internal arrival;
    FlightMarket internal protection;
    FlightMarket internal range;

    address internal trader = address(0xB0B);

    function setUp() public {
        usdg = new MockERC20("Global Dollar", "USDG", 6);
        registry = new FlightRegistry(address(this));
        oracle = new FlightOracleConsumer(address(this), address(this));
        factory = new MarketFactory(
            address(this),
            address(usdg),
            address(oracle),
            address(registry),
            address(0),
            "ipfs://x/{id}"
        );
        lens = new MarketLens(factory);

        arrival = uint64(block.timestamp + 6 hours);
        registry.registerFlight(flightId, "SQ956", "SIN-CGK", arrival, 120);
        protection = FlightMarket(factory.createProtection(flightId));
        range = FlightMarket(factory.createRange(flightId, arrival, arrival + 10 minutes));

        usdg.mint(address(this), 10_000 * UNIT);
        usdg.approve(address(protection), type(uint256).max);
        usdg.approve(address(range), type(uint256).max);
        protection.addLiquidity(1_000 * UNIT);
        range.addLiquidity(500 * UNIT);

        usdg.mint(trader, 1_000 * UNIT);
        vm.startPrank(trader);
        usdg.approve(address(protection), type(uint256).max);
        protection.buy(Outcome.Delayed, 50 * UNIT, 0);
        vm.stopPrank();
    }

    function test_FlightsListsMarketsWithState() public view {
        FlightView[] memory views = lens.flights();

        assertEq(views.length, 1);
        assertEq(views[0].number, "SQ956");
        assertEq(views[0].route, "SIN-CGK");
        assertEq(views[0].scheduledArrival, arrival);
        assertEq(views[0].protection.market, address(protection));
        assertEq(views[0].protection.volume, 50 * UNIT);
        assertEq(views[0].protection.locked, 1_050 * UNIT);
        assertGt(views[0].protection.delayedProbability, 0.5e18);
        assertEq(views[0].ranges.length, 1);
        assertEq(views[0].ranges[0].market, address(range));
        assertEq(uint256(views[0].ranges[0].kind), uint256(MarketKind.Range));
        assertEq(views[0].ranges[0].upperBound, arrival + 10 minutes);
    }

    function test_PositionsOfReturnsOnlyHeldMarkets() public view {
        PositionView[] memory positions = lens.positionsOf(trader);

        assertEq(positions.length, 1);
        assertEq(positions[0].market, address(protection));
        assertEq(positions[0].number, "SQ956");
        assertGt(positions[0].delayedBalance, 50 * UNIT);
        assertEq(positions[0].contribution, 50 * UNIT);

        PositionView[] memory lpPositions = lens.positionsOf(address(this));
        assertEq(lpPositions.length, 2);
        assertEq(lpPositions[0].lpShares, 1_000 * UNIT);
        assertGt(lpPositions[0].lpValue, 0);
        assertLe(lpPositions[0].lpValue, 1_050 * UNIT);
    }

    function test_PositionsOfEmptyForStranger() public view {
        assertEq(lens.positionsOf(address(0xCAFE)).length, 0);
    }
}
