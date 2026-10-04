// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IFlightOracle } from "../interfaces/IFlightOracle.sol";
import { IPassRegistry } from "../interfaces/IPassRegistry.sol";
import { OutcomeToken } from "../tokens/OutcomeToken.sol";
import { MarketKind, Outcome } from "../types/FlightTypes.sol";
import {
    InsufficientLiquidity,
    InsufficientShares,
    InvalidProbability,
    MarketAlreadyResolved,
    MarketAlreadySeeded,
    MarketClosed,
    MarketNotResolved,
    MarketNotSeeded,
    NotPassenger,
    NothingToRedeem,
    ResolutionFinal,
    ResolutionNotFinal,
    SlippageExceeded,
    Unauthorized,
    ZeroAddress,
    ZeroAmount
} from "../lib/Errors.sol";

contract FlightMarket is IERC1155Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant WAD = 1e18;
    /// After this long past scheduled arrival with no final arrival time, anyone can void the
    /// market, so funds never wait on the operator.
    uint256 public constant VOID_GRACE = 3 days;
    uint256 public constant MIN_SEED_PROBABILITY = 0.01e18;

    IERC20 public immutable collateral;
    IFlightOracle public immutable oracle;
    OutcomeToken public immutable outcome;
    /// The factory that listed this market; its owner is the operator.
    address public immutable factory;
    IPassRegistry public immutable passes;

    bytes32 public immutable flightId;
    MarketKind public immutable kind;
    uint16 public immutable delayThresholdMinutes;
    uint64 public immutable scheduledDeparture;
    uint64 public immutable scheduledArrival;
    uint64 public immutable strikeArrival;
    uint64 public immutable lowerBound;
    uint64 public immutable upperBound;

    uint256 public totalShares;
    uint256 public lpCollateral;
    uint256 public volume;
    mapping(address => uint256) public shares;
    mapping(address => uint256) public principal;
    mapping(address => uint256) public contributions;

    bool public resolved;
    bool public voided;
    Outcome public winning;

    event LiquidityAdded(address indexed provider, uint256 amount, uint256 sharesMinted);
    event LiquidityRemoved(address indexed provider, uint256 sharesBurned, uint256 amountOut);
    event Bought(
        address indexed buyer,
        Outcome want,
        uint256 collateralIn,
        uint256 sharesOut,
        uint256 delayedProbability
    );
    event Resolved(Outcome winning, int32 delayMinutes);
    event Voided();
    event Refunded(address indexed holder, uint256 amountOut);
    event Redeemed(address indexed holder, uint256 amountOut);

    constructor(
        address collateral_,
        address oracle_,
        bytes32 flightId_,
        MarketKind kind_,
        uint16 delayThresholdMinutes_,
        uint64 scheduledDeparture_,
        uint64 scheduledArrival_,
        uint64 strikeArrival_,
        uint64 lowerBound_,
        uint64 upperBound_,
        address passes_,
        string memory uri_
    ) {
        if (collateral_ == address(0) || oracle_ == address(0)) {
            revert ZeroAddress();
        }
        collateral = IERC20(collateral_);
        oracle = IFlightOracle(oracle_);
        factory = msg.sender;
        flightId = flightId_;
        kind = kind_;
        delayThresholdMinutes = delayThresholdMinutes_;
        scheduledDeparture = scheduledDeparture_;
        scheduledArrival = scheduledArrival_;
        strikeArrival = strikeArrival_;
        lowerBound = lowerBound_;
        upperBound = upperBound_;
        passes = IPassRegistry(passes_);
        outcome = new OutcomeToken(address(this), uri_);
    }

    /// The operator that seeds odds and voids cancelled flights: whoever owns the factory now.
    function resolver() public view returns (address) {
        return Ownable(factory).owner();
    }

    function isOpen() public view returns (bool) {
        return !resolved && !voided;
    }

    function isTrading() public view returns (bool) {
        return isOpen() && block.timestamp < scheduledDeparture;
    }

    /// The operator opens the pool at a chosen delay probability, as a liquidity deposit rather
    /// than a trade, so it never holds a position it could profit from by reporting.
    function seed(uint256 amount, uint256 delayedProbability)
        external
        nonReentrant
        returns (uint256 sharesMinted)
    {
        if (msg.sender != resolver()) revert Unauthorized();
        if (totalShares != 0) revert MarketAlreadySeeded();
        if (
            delayedProbability < MIN_SEED_PROBABILITY
                || delayedProbability > WAD - MIN_SEED_PROBABILITY
        ) revert InvalidProbability();
        _deposit(amount);

        // probability(Delayed) = reserveOnTime / (reserveOnTime + reserveDelayed)
        uint256 onTimeWeight = delayedProbability;
        uint256 delayedWeight = WAD - delayedProbability;
        uint256 poolWeight = onTimeWeight > delayedWeight ? onTimeWeight : delayedWeight;
        _returnExcess(outcome.ON_TIME(), amount, onTimeWeight, poolWeight);
        _returnExcess(outcome.DELAYED(), amount, delayedWeight, poolWeight);

        sharesMinted = amount;
        _credit(amount, sharesMinted);
    }

    function addLiquidity(uint256 amount) external nonReentrant returns (uint256 sharesMinted) {
        if (totalShares == 0) revert MarketNotSeeded();

        uint256 onTimeId = outcome.ON_TIME();
        uint256 delayedId = outcome.DELAYED();
        uint256 reserveOnTime = outcome.balanceOf(address(this), onTimeId);
        uint256 reserveDelayed = outcome.balanceOf(address(this), delayedId);
        _deposit(amount);

        uint256 poolWeight = reserveOnTime > reserveDelayed ? reserveOnTime : reserveDelayed;
        sharesMinted = (amount * totalShares) / poolWeight;
        _returnExcess(onTimeId, amount, reserveOnTime, poolWeight);
        _returnExcess(delayedId, amount, reserveDelayed, poolWeight);
        if (sharesMinted == 0) revert InsufficientLiquidity();

        _credit(amount, sharesMinted);
    }

    function removeLiquidity(uint256 amount) external nonReentrant returns (uint256 amountOut) {
        if (amount == 0 || shares[msg.sender] < amount) revert InsufficientShares();

        uint256 winningId = _winningId();

        if (voided) {
            amountOut = (principal[msg.sender] * amount) / shares[msg.sender];
            principal[msg.sender] -= amountOut;
            lpCollateral -= amountOut;
        } else {
            if (!resolved) revert MarketNotResolved();
            uint256 reserveWinning = outcome.balanceOf(address(this), winningId);
            amountOut = (amount * reserveWinning) / totalShares;
            outcome.burn(address(this), winningId, amountOut);
        }

        shares[msg.sender] -= amount;
        totalShares -= amount;
        if (amountOut == 0) revert InsufficientLiquidity();

        collateral.safeTransfer(msg.sender, amountOut);

        emit LiquidityRemoved(msg.sender, amount, amountOut);
    }

    function buy(Outcome want, uint256 collateralIn, uint256 minSharesOut)
        external
        nonReentrant
        returns (uint256 sharesOut)
    {
        if (!isOpen()) revert MarketAlreadyResolved();
        if (block.timestamp >= scheduledDeparture) revert MarketClosed();
        if (collateralIn == 0) revert ZeroAmount();
        if (_requiresPass()) {
            if (!passes.isPassenger(flightId, msg.sender)) revert NotPassenger();
            passes.recordStake(flightId, msg.sender, collateralIn);
        }

        uint256 wantId = _id(want);
        uint256 unwantedId = wantId == outcome.ON_TIME() ? outcome.DELAYED() : outcome.ON_TIME();

        uint256 reserveWant = outcome.balanceOf(address(this), wantId);
        uint256 reserveUnwanted = outcome.balanceOf(address(this), unwantedId);
        if (reserveWant == 0 || reserveUnwanted == 0) revert InsufficientLiquidity();

        collateral.safeTransferFrom(msg.sender, address(this), collateralIn);
        contributions[msg.sender] += collateralIn;

        outcome.mint(address(this), unwantedId, collateralIn);
        uint256 dy = (reserveWant * collateralIn) / (reserveUnwanted + collateralIn);
        if (dy == 0 || dy >= reserveWant) revert InsufficientLiquidity();

        outcome.mint(msg.sender, wantId, collateralIn);
        outcome.transferOut(msg.sender, wantId, dy);

        sharesOut = collateralIn + dy;
        if (sharesOut < minSharesOut) revert SlippageExceeded();
        volume += collateralIn;
        emit Bought(msg.sender, want, collateralIn, sharesOut, probability(Outcome.Delayed));
    }

    function resolve() external nonReentrant {
        if (!isOpen()) revert MarketAlreadyResolved();

        (int32 delayMinutes, bool finalized) = oracle.resolution(flightId);
        if (!finalized) revert ResolutionNotFinal();

        resolved = true;
        winning = _computeWinning(delayMinutes);

        emit Resolved(winning, delayMinutes);
    }

    /// Cancelled or diverted flights refund everyone. A flight with a final arrival time can no
    /// longer be voided, and after the grace period anyone can void a flight nobody reported.
    function resolveVoid() external {
        if (!isOpen()) revert MarketAlreadyResolved();
        (, bool finalized) = oracle.resolution(flightId);
        if (finalized) revert ResolutionFinal();
        if (msg.sender != resolver() && block.timestamp < uint256(scheduledArrival) + VOID_GRACE) {
            revert Unauthorized();
        }

        voided = true;
        emit Voided();
    }

    function refund() external nonReentrant returns (uint256) {
        return _refund(msg.sender);
    }

    /// Anyone may push a refund; it can only ever go to the holder.
    function refundFor(address holder) external nonReentrant returns (uint256) {
        return _refund(holder);
    }

    function redeem() external nonReentrant returns (uint256) {
        return _redeem(msg.sender);
    }

    /// Anyone may push a payout; it can only ever go to the holder. The resolver pays every
    /// winner this way right after settlement, so nobody has to come back and claim.
    function redeemFor(address holder) external nonReentrant returns (uint256) {
        return _redeem(holder);
    }

    function probability(Outcome o) public view returns (uint256) {
        uint256 reserveOnTime = outcome.balanceOf(address(this), outcome.ON_TIME());
        uint256 reserveDelayed = outcome.balanceOf(address(this), outcome.DELAYED());
        uint256 sum = reserveOnTime + reserveDelayed;
        if (sum == 0) return 0;
        return o == Outcome.Delayed ? (reserveOnTime * WAD) / sum : (reserveDelayed * WAD) / sum;
    }

    function reserves() external view returns (uint256 reserveOnTime, uint256 reserveDelayed) {
        return (
            outcome.balanceOf(address(this), outcome.ON_TIME()),
            outcome.balanceOf(address(this), outcome.DELAYED())
        );
    }

    function _deposit(uint256 amount) private {
        if (!isOpen()) revert MarketAlreadyResolved();
        if (block.timestamp >= scheduledDeparture) revert MarketClosed();
        if (amount == 0) revert ZeroAmount();
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        outcome.mint(address(this), outcome.ON_TIME(), amount);
        outcome.mint(address(this), outcome.DELAYED(), amount);
    }

    function _credit(uint256 amount, uint256 sharesMinted) private {
        lpCollateral += amount;
        totalShares += sharesMinted;
        shares[msg.sender] += sharesMinted;
        principal[msg.sender] += amount;
        emit LiquidityAdded(msg.sender, amount, sharesMinted);
    }

    function _refund(address holder) private returns (uint256 amountOut) {
        if (!voided) revert MarketNotResolved();

        amountOut = contributions[holder];
        if (amountOut == 0) revert NothingToRedeem();

        contributions[holder] = 0;
        collateral.safeTransfer(holder, amountOut);

        emit Refunded(holder, amountOut);
    }

    function _redeem(address holder) private returns (uint256 amountOut) {
        if (!resolved || voided) revert MarketNotResolved();

        uint256 winningId = _winningId();
        amountOut = outcome.balanceOf(holder, winningId);
        if (amountOut == 0) revert NothingToRedeem();

        outcome.burn(holder, winningId, amountOut);
        collateral.safeTransfer(holder, amountOut);

        emit Redeemed(holder, amountOut);
    }

    /// Every side of every market on a flight is for its passengers, the operator included.
    function _requiresPass() private view returns (bool) {
        return address(passes) != address(0);
    }

    function _returnExcess(uint256 id, uint256 amount, uint256 reserve, uint256 poolWeight)
        private
    {
        uint256 kept = (amount * reserve) / poolWeight;
        if (amount > kept) outcome.transferOut(msg.sender, id, amount - kept);
    }

    function _computeWinning(int32 delayMinutes) private view returns (Outcome) {
        int64 actualArrival = int64(uint64(scheduledArrival)) + int64(delayMinutes) * 60;

        if (kind == MarketKind.Protection) {
            return
                delayMinutes > int32(uint32(delayThresholdMinutes))
                    ? Outcome.Delayed
                    : Outcome.OnTime;
        }
        if (kind == MarketKind.Threshold) {
            return actualArrival <= int64(uint64(strikeArrival)) ? Outcome.OnTime : Outcome.Delayed;
        }
        return (actualArrival > int64(uint64(lowerBound))
                && actualArrival <= int64(uint64(upperBound)))
            ? Outcome.OnTime
            : Outcome.Delayed;
    }

    function _id(Outcome o) private view returns (uint256) {
        return o == Outcome.Delayed ? outcome.DELAYED() : outcome.ON_TIME();
    }

    function _winningId() private view returns (uint256) {
        return winning == Outcome.Delayed ? outcome.DELAYED() : outcome.ON_TIME();
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId
            || interfaceId == type(IERC165).interfaceId;
    }
}
