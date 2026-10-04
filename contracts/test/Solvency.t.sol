// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";

import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { FlightRegistry } from "../src/registry/FlightRegistry.sol";
import { FlightOracleConsumer } from "../src/oracle/FlightOracleConsumer.sol";
import { MarketFactory } from "../src/market/MarketFactory.sol";
import { FlightMarket } from "../src/market/FlightMarket.sol";
import { Outcome } from "../src/types/FlightTypes.sol";

/// Whatever sequence of deposits and trades happens, every holder can exit after settlement
/// and the market never owes more collateral than it holds.
contract SolvencyTest is Test {
    uint256 internal constant UNIT = 1e6;
    uint256 internal constant ACTORS = 4;

    MockERC20 internal usdg;
    FlightOracleConsumer internal oracle;
    FlightMarket internal market;
    bytes32 internal flightId = keccak256("AK714-2026-10-03");
    address[ACTORS] internal actors;

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 6);
        FlightRegistry registry = new FlightRegistry(address(this));
        oracle = new FlightOracleConsumer(address(this), address(this));
        MarketFactory factory = new MarketFactory(
            address(this), address(usdg), address(oracle), address(registry), address(0), ""
        );
        registry.registerFlight(
            flightId,
            "AK714",
            "SIN-KUL",
            uint64(block.timestamp + 1 hours),
            uint64(block.timestamp + 2 hours),
            30
        );
        market = FlightMarket(factory.createProtection(flightId));

        for (uint256 i; i < ACTORS; ++i) {
            actors[i] = address(uint160(0x1000 + i));
            usdg.mint(actors[i], 10_000_000 * UNIT);
            vm.prank(actors[i]);
            usdg.approve(address(market), type(uint256).max);
        }
    }

    function testFuzz_EveryoneExits(uint256 seed, int32 delayMinutes, bool voidIt) public {
        delayMinutes = int32(bound(delayMinutes, -120, 600));

        vm.prank(actors[0]);
        market.addLiquidity(bound(seed, 1, 50_000) * UNIT);

        for (uint256 step; step < 12; ++step) {
            uint256 roll = uint256(keccak256(abi.encode(seed, step)));
            address actor = actors[roll % ACTORS];
            uint256 amount = bound(roll >> 8, 1, 5_000 * UNIT);
            vm.prank(actor);
            if ((roll >> 128) % 3 == 0) {
                market.addLiquidity(amount);
            } else {
                Outcome want = (roll >> 200) % 2 == 0 ? Outcome.OnTime : Outcome.Delayed;
                try market.buy(want, amount, 0) { } catch { }
            }
        }

        if (voidIt) {
            market.resolveVoid();
        } else {
            oracle.postResolution(flightId, delayMinutes, true);
            market.resolve();
        }

        for (uint256 i; i < ACTORS; ++i) {
            vm.startPrank(actors[i]);
            uint256 lpShares = market.shares(actors[i]);
            if (lpShares > 0) market.removeLiquidity(lpShares);
            if (voidIt) {
                if (market.contributions(actors[i]) > 0) market.refund();
            } else {
                try market.redeem() { } catch { }
            }
            vm.stopPrank();
        }

        assertEq(market.totalShares(), 0);
        // Rounding dust stays behind, never a shortfall.
        assertLe(usdg.balanceOf(address(market)), 2 * ACTORS);
    }
}
