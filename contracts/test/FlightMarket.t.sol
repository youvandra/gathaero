// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";

import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { FlightRegistry } from "../src/registry/FlightRegistry.sol";
import { FlightOracleConsumer } from "../src/oracle/FlightOracleConsumer.sol";
import { MockFeeder } from "../src/oracle/MockFeeder.sol";
import { MarketFactory } from "../src/market/MarketFactory.sol";
import { FlightMarket } from "../src/market/FlightMarket.sol";
import { Outcome } from "../src/types/FlightTypes.sol";
import {
    InsufficientShares,
    MarketAlreadyResolved,
    MarketNotResolved,
    NothingToRedeem,
    ResolutionNotFinal,
    Unauthorized
} from "../src/lib/Errors.sol";

contract FlightMarketTest is Test {
    uint256 internal constant UNIT = 1e6;
    uint16 internal constant THRESHOLD = 120;

    MockERC20 internal usdc;
    FlightRegistry internal registry;
    FlightOracleConsumer internal oracle;
    MockFeeder internal feeder;
    MarketFactory internal factory;
    FlightMarket internal market;

    bytes32 internal flightId;
    uint64 internal scheduledArrival;

    address internal lp = address(0xA11CE);
    address internal trader = address(0xB0B);
    address internal stranger = address(0xCAFE);

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        registry = new FlightRegistry(address(this));
        oracle = new FlightOracleConsumer(address(this), address(this));
        feeder = new MockFeeder(address(oracle), address(this));
        oracle.setReporter(address(feeder), true);

        factory = new MarketFactory(
            address(this),
            address(usdc),
            address(oracle),
            address(registry),
            "ipfs://gathaero/{id}.json"
        );

        flightId = keccak256("SQ956-2026-10-01");
        scheduledArrival = uint64(block.timestamp + 2 hours);
        registry.registerFlight(flightId, "SQ956", "SIN-CGK", scheduledArrival, THRESHOLD);
        market = FlightMarket(factory.createProtection(flightId));

        usdc.mint(lp, 1_000_000 * UNIT);
        usdc.mint(trader, 1_000_000 * UNIT);

        vm.prank(lp);
        usdc.approve(address(market), type(uint256).max);
        vm.prank(trader);
        usdc.approve(address(market), type(uint256).max);
    }

    function test_AddLiquiditySeedsReserves() public {
        vm.prank(lp);
        uint256 minted = market.addLiquidity(1_000 * UNIT);

        (uint256 reserveOnTime, uint256 reserveDelayed) = market.reserves();
        assertEq(minted, 1_000 * UNIT);
        assertEq(reserveOnTime, 1_000 * UNIT);
        assertEq(reserveDelayed, 1_000 * UNIT);
        assertEq(market.probability(Outcome.Delayed), 0.5e18);
    }

    function test_BuyDelayedMovesProbability() public {
        vm.prank(lp);
        market.addLiquidity(1_000 * UNIT);

        vm.prank(trader);
        uint256 sharesOut = market.buy(Outcome.Delayed, 100 * UNIT);

        uint256 expectedDy = (1_000 * UNIT * 100 * UNIT) / (1_000 * UNIT + 100 * UNIT);
        assertEq(sharesOut, 100 * UNIT + expectedDy);
        assertGt(market.probability(Outcome.Delayed), 0.5e18);
    }

    function test_ResolveBeforeFinalReverts() public {
        vm.prank(lp);
        market.addLiquidity(1_000 * UNIT);

        feeder.feed(flightId, 150, false);
        vm.expectRevert(ResolutionNotFinal.selector);
        market.resolve();
    }

    function test_DelayedWinsPaysHolder() public {
        vm.prank(lp);
        market.addLiquidity(1_000 * UNIT);
        vm.prank(trader);
        uint256 sharesOut = market.buy(Outcome.Delayed, 100 * UNIT);

        feeder.feed(flightId, 150, true);
        market.resolve();
        assertEq(uint256(market.winning()), uint256(Outcome.Delayed));

        uint256 before = usdc.balanceOf(trader);
        vm.prank(trader);
        uint256 payout = market.redeem();
        assertEq(payout, sharesOut);
        assertEq(usdc.balanceOf(trader), before + payout);
    }

    function test_OnTimeWinsLeavesDelayedPositionWorthless() public {
        vm.prank(lp);
        market.addLiquidity(1_000 * UNIT);
        vm.prank(trader);
        market.buy(Outcome.Delayed, 100 * UNIT);

        feeder.feed(flightId, 30, true);
        market.resolve();
        assertEq(uint256(market.winning()), uint256(Outcome.OnTime));

        vm.prank(trader);
        vm.expectRevert(NothingToRedeem.selector);
        market.redeem();
    }

    function test_LpWithdrawsAfterResolution() public {
        vm.prank(lp);
        uint256 minted = market.addLiquidity(1_000 * UNIT);
        vm.prank(trader);
        market.buy(Outcome.Delayed, 100 * UNIT);

        feeder.feed(flightId, 150, true);
        market.resolve();

        vm.prank(lp);
        uint256 out = market.removeLiquidity(minted);
        assertGt(out, 0);
        assertEq(market.shares(lp), 0);
    }

    function test_BuyAfterResolutionReverts() public {
        vm.prank(lp);
        market.addLiquidity(1_000 * UNIT);

        feeder.feed(flightId, 150, true);
        market.resolve();

        vm.prank(trader);
        vm.expectRevert(MarketAlreadyResolved.selector);
        market.buy(Outcome.Delayed, 100 * UNIT);
    }

    function test_RemoveLiquidityBeforeResolutionReverts() public {
        vm.prank(lp);
        uint256 minted = market.addLiquidity(1_000 * UNIT);

        vm.prank(lp);
        vm.expectRevert(MarketNotResolved.selector);
        market.removeLiquidity(minted);
    }

    function test_OnlyReporterCanPost() public {
        vm.prank(stranger);
        vm.expectRevert(Unauthorized.selector);
        oracle.postResolution(flightId, 150, true);
    }

    function test_OnlyOwnerCanFeed() public {
        vm.prank(stranger);
        vm.expectRevert();
        feeder.feed(flightId, 150, true);
    }

    function test_BuyAccumulatesVolume() public {
        vm.prank(lp);
        market.addLiquidity(1_000 * UNIT);
        vm.startPrank(trader);
        market.buy(Outcome.Delayed, 100 * UNIT);
        market.buy(Outcome.OnTime, 40 * UNIT);
        vm.stopPrank();

        assertEq(market.volume(), 140 * UNIT);
    }

    function testFactoryRejectsDuplicateMarket() public {
        vm.expectRevert();
        factory.createProtection(flightId);
    }

    function testRangeMarketsResolveByArrival() public {
        FlightMarket inRange = FlightMarket(
            factory.createRange(
                flightId, scheduledArrival + 5 minutes, scheduledArrival + 15 minutes
            )
        );
        FlightMarket outRange = FlightMarket(
            factory.createRange(
                flightId, scheduledArrival + 20 minutes, scheduledArrival + 30 minutes
            )
        );

        feeder.feed(flightId, 10, true);

        inRange.resolve();
        assertEq(uint256(inRange.winning()), uint256(Outcome.OnTime));

        outRange.resolve();
        assertEq(uint256(outRange.winning()), uint256(Outcome.Delayed));
    }

    function testVoidRefundsBuyerAndLp() public {
        vm.prank(lp);
        uint256 lpShares = market.addLiquidity(1_000 * UNIT);
        vm.prank(trader);
        market.buy(Outcome.Delayed, 100 * UNIT);

        market.resolveVoid();
        assertTrue(market.voided());

        uint256 traderBefore = usdc.balanceOf(trader);
        vm.prank(trader);
        uint256 refunded = market.refund();
        assertEq(refunded, 100 * UNIT);
        assertEq(usdc.balanceOf(trader), traderBefore + 100 * UNIT);

        uint256 lpBefore = usdc.balanceOf(lp);
        vm.prank(lp);
        uint256 out = market.removeLiquidity(lpShares);
        assertEq(out, 1_000 * UNIT);
        assertEq(usdc.balanceOf(lp), lpBefore + 1_000 * UNIT);
    }

    function testThresholdMarketsResolveByArrival() public {
        FlightMarket landsBy =
            FlightMarket(factory.createThreshold(flightId, scheduledArrival + 30 minutes));
        FlightMarket tooEarly =
            FlightMarket(factory.createThreshold(flightId, scheduledArrival - 10 minutes));

        feeder.feed(flightId, 10, true);

        landsBy.resolve();
        assertEq(uint256(landsBy.winning()), uint256(Outcome.OnTime));

        tooEarly.resolve();
        assertEq(uint256(tooEarly.winning()), uint256(Outcome.Delayed));
    }
}
