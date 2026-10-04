// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";
import { ERC1155Holder } from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

import { MockERC20 } from "../src/mocks/MockERC20.sol";
import { FlightRegistry } from "../src/registry/FlightRegistry.sol";
import { PassRegistry } from "../src/registry/PassRegistry.sol";
import { FlightOracleConsumer } from "../src/oracle/FlightOracleConsumer.sol";
import { MarketFactory } from "../src/market/MarketFactory.sol";
import { FlightMarket } from "../src/market/FlightMarket.sol";
import { OutcomeToken } from "../src/tokens/OutcomeToken.sol";
import { Outcome } from "../src/types/FlightTypes.sol";
import {
    NotPassenger,
    NotTransferable,
    PassAlreadyUsed,
    PassExpired,
    StakeLimitExceeded,
    Unauthorized
} from "../src/lib/Errors.sol";

contract PassRegistryTest is Test, ERC1155Holder {
    uint256 internal constant UNIT = 1e6;
    uint256 internal constant VERIFIER_KEY = 0xA11CE;

    bytes32 internal flightId = keccak256("SQ962-2026-10-03");
    bytes32 internal passHash = keccak256("ABC123|DOE JOHN");

    MockERC20 internal usdg;
    PassRegistry internal passes;
    FlightMarket internal protection;
    FlightMarket internal range;

    address internal passenger = address(0xB0B);
    address internal other = address(0xCAFE);

    function setUp() public {
        usdg = new MockERC20("Global Dollar", "USDG", 6);
        FlightRegistry registry = new FlightRegistry(address(this));
        FlightOracleConsumer oracle = new FlightOracleConsumer(address(this), address(this));
        passes = new PassRegistry(address(this), vm.addr(VERIFIER_KEY));
        MarketFactory factory = new MarketFactory(
            address(this),
            address(usdg),
            address(oracle),
            address(registry),
            address(passes),
            "ipfs://x/{id}"
        );

        passes.setMarkets(address(factory));

        registry.registerFlight(
            flightId,
            "SQ962",
            "SIN-CGK",
            uint64(block.timestamp + 4 hours),
            uint64(block.timestamp + 6 hours),
            30
        );
        protection = FlightMarket(factory.createProtection(flightId));

        usdg.mint(address(this), 1_000 * UNIT);
        usdg.approve(address(protection), type(uint256).max);
        protection.seed(1_000 * UNIT, 0.2e18);

        uint64 arrival = uint64(block.timestamp + 6 hours);
        range =
            FlightMarket(factory.createRange(flightId, arrival - 10 minutes, arrival + 10 minutes));
        usdg.mint(address(this), 1_000 * UNIT);
        usdg.approve(address(range), type(uint256).max);
        range.seed(1_000 * UNIT, 0.6e18);

        for (uint256 i; i < 2; ++i) {
            address wallet = i == 0 ? passenger : other;
            usdg.mint(wallet, 100 * UNIT);
            vm.prank(wallet);
            usdg.approve(address(protection), type(uint256).max);
            vm.prank(wallet);
            usdg.approve(address(range), type(uint256).max);
        }
    }

    function _sign(address wallet, bytes32 hash, uint64 expiry)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = keccak256(
            abi.encode(passes.PASS_TYPEHASH(), flightId, wallet, hash, expiry)
        );
        bytes32 domain = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("Gathaero"),
                keccak256("1"),
                block.chainid,
                address(passes)
            )
        );
        (uint8 v, bytes32 r, bytes32 s) =
            vm.sign(VERIFIER_KEY, keccak256(abi.encodePacked("\x19\x01", domain, structHash)));
        return abi.encodePacked(r, s, v);
    }

    function test_ProtectionRequiresPass() public {
        vm.prank(passenger);
        vm.expectRevert(NotPassenger.selector);
        protection.buy(Outcome.Delayed, 10 * UNIT, 0);
    }

    function test_RegisteredPassengerCanBuyProtection() public {
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes memory signature = _sign(passenger, passHash, expiry);

        vm.startPrank(passenger);
        passes.register(flightId, passHash, expiry, signature);
        protection.buy(Outcome.Delayed, 10 * UNIT, 0);
        vm.stopPrank();

        assertTrue(passes.isPassenger(flightId, passenger));
        assertGt(protection.outcome().balanceOf(passenger, 1), 0);
    }

    function test_OnTimeSideRequiresPass() public {
        vm.prank(other);
        vm.expectRevert(NotPassenger.selector);
        protection.buy(Outcome.OnTime, 10 * UNIT, 0);
    }

    function test_RangeRequiresPass() public {
        vm.prank(other);
        usdg.approve(address(range), type(uint256).max);
        vm.prank(other);
        vm.expectRevert(NotPassenger.selector);
        range.buy(Outcome.Delayed, 10 * UNIT, 0);
    }

    function test_PassengerCanBuyRange() public {
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes memory signature = _sign(passenger, passHash, expiry);

        vm.startPrank(passenger);
        passes.register(flightId, passHash, expiry, signature);
        usdg.approve(address(range), type(uint256).max);
        range.buy(Outcome.Delayed, 10 * UNIT, 0);
        vm.stopPrank();

        assertGt(range.outcome().balanceOf(passenger, 1), 0);
    }

    function test_SeedSetsOpeningOddsWithoutATrade() public view {
        assertApproxEqAbs(protection.probability(Outcome.Delayed), 0.2e18, 1e12);
        assertApproxEqAbs(range.probability(Outcome.Delayed), 0.6e18, 1e12);
        assertEq(protection.volume(), 0);
    }

    function test_OperatorCannotTradeWithoutPass() public {
        usdg.mint(address(this), 10 * UNIT);
        vm.expectRevert(NotPassenger.selector);
        protection.buy(Outcome.OnTime, 10 * UNIT, 0);
    }

    function test_OnlyListedMarketsRecordStake() public {
        vm.expectRevert(Unauthorized.selector);
        passes.recordStake(flightId, passenger, 1);
    }

    function test_SignatureIsBoundToWallet() public {
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes memory signature = _sign(passenger, passHash, expiry);

        vm.prank(other);
        vm.expectRevert(Unauthorized.selector);
        passes.register(flightId, passHash, expiry, signature);
    }

    function test_OnePassOneWallet() public {
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes memory forPassenger = _sign(passenger, passHash, expiry);
        bytes memory forOther = _sign(other, passHash, expiry);

        vm.prank(passenger);
        passes.register(flightId, passHash, expiry, forPassenger);

        vm.prank(other);
        vm.expectRevert(PassAlreadyUsed.selector);
        passes.register(flightId, passHash, expiry, forOther);
    }

    function test_ExpiredSignatureRejected() public {
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes memory signature = _sign(passenger, passHash, expiry);
        vm.warp(expiry + 1);

        vm.prank(passenger);
        vm.expectRevert(PassExpired.selector);
        passes.register(flightId, passHash, expiry, signature);
    }

    function _verify(address wallet) internal {
        uint64 expiry = uint64(block.timestamp + 1 hours);
        bytes memory signature = _sign(wallet, passHash, expiry);
        vm.prank(wallet);
        passes.register(flightId, passHash, expiry, signature);
    }

    function test_StakeIsCappedAcrossTheFlight() public {
        _verify(passenger);
        usdg.mint(passenger, 200 * UNIT);

        vm.startPrank(passenger);
        protection.buy(Outcome.Delayed, 150 * UNIT, 0);
        range.buy(Outcome.OnTime, 50 * UNIT, 0);
        vm.expectRevert(StakeLimitExceeded.selector);
        range.buy(Outcome.Delayed, 1, 0);
        vm.expectRevert(StakeLimitExceeded.selector);
        protection.buy(Outcome.Delayed, 1, 0);
        vm.stopPrank();
        assertEq(passes.staked(flightId, passenger), 200 * UNIT);
    }

    function test_PositionsCannotBeTransferred() public {
        _verify(passenger);
        vm.startPrank(passenger);
        protection.buy(Outcome.Delayed, 10 * UNIT, 0);
        OutcomeToken token = protection.outcome();
        uint256 balance = token.balanceOf(passenger, 1);
        vm.expectRevert(NotTransferable.selector);
        token.safeTransferFrom(passenger, other, 1, balance, "");
        vm.stopPrank();
    }
}
