// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC1155Receiver } from "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IFlightOracle } from "../interfaces/IFlightOracle.sol";
import { IPassRegistry } from "../interfaces/IPassRegistry.sol";
import { OutcomeToken } from "../tokens/OutcomeToken.sol";
import { MarketKind, Outcome } from "../types/FlightTypes.sol";
import {
    InsufficientLiquidity,
    InsufficientShares,
    MarketAlreadyResolved,
    MarketClosed,
    MarketNotResolved,
    NotPassenger,
    NothingToRedeem,
    ResolutionNotFinal,
    SlippageExceeded,
    Unauthorized,
    ZeroAddress,
    ZeroAmount
} from "../lib/Errors.sol";

contract FlightMarket is IERC1155Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant WAD = 1e18;

    IERC20 public immutable collateral;
    IFlightOracle public immutable oracle;
    OutcomeToken public immutable outcome;
    address public immutable resolver;
    IPassRegistry public immutable passes;

    bytes32 public immutable flightId;
    MarketKind public immutable kind;
    uint16 public immutable delayThresholdMinutes;
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
    event Redeemed(address indexed holder, uint256 sharesBurned, uint256 amountOut);

    constructor(
        address collateral_,
        address oracle_,
        address resolver_,
        bytes32 flightId_,
        MarketKind kind_,
        uint16 delayThresholdMinutes_,
        uint64 scheduledArrival_,
        uint64 strikeArrival_,
        uint64 lowerBound_,
        uint64 upperBound_,
        address passes_,
        string memory uri_
    ) {
        if (collateral_ == address(0) || oracle_ == address(0) || resolver_ == address(0)) {
            revert ZeroAddress();
        }
        collateral = IERC20(collateral_);
        oracle = IFlightOracle(oracle_);
        resolver = resolver_;
        flightId = flightId_;
        kind = kind_;
        delayThresholdMinutes = delayThresholdMinutes_;
        scheduledArrival = scheduledArrival_;
        strikeArrival = strikeArrival_;
        lowerBound = lowerBound_;
        upperBound = upperBound_;
        passes = IPassRegistry(passes_);
        outcome = new OutcomeToken(address(this), uri_);
    }

    function isOpen() public view returns (bool) {
        return !resolved && !voided;
    }

    function isTrading() public view returns (bool) {
        return isOpen() && block.timestamp < scheduledArrival;
    }

    function addLiquidity(uint256 amount) external nonReentrant returns (uint256 sharesMinted) {
        if (!isOpen()) revert MarketAlreadyResolved();
        if (block.timestamp >= scheduledArrival) revert MarketClosed();
        if (amount == 0) revert ZeroAmount();

        uint256 onTimeId = outcome.ON_TIME();
        uint256 delayedId = outcome.DELAYED();
        uint256 reserveOnTime = outcome.balanceOf(address(this), onTimeId);
        uint256 reserveDelayed = outcome.balanceOf(address(this), delayedId);

        collateral.safeTransferFrom(msg.sender, address(this), amount);
        outcome.mint(address(this), onTimeId, amount);
        outcome.mint(address(this), delayedId, amount);

        if (totalShares == 0) {
            sharesMinted = amount;
        } else {
            uint256 poolWeight = reserveOnTime > reserveDelayed ? reserveOnTime : reserveDelayed;
            sharesMinted = (amount * totalShares) / poolWeight;
            _returnExcess(onTimeId, amount, reserveOnTime, poolWeight);
            _returnExcess(delayedId, amount, reserveDelayed, poolWeight);
        }
        if (sharesMinted == 0) revert InsufficientLiquidity();

        lpCollateral += amount;
        totalShares += sharesMinted;
        shares[msg.sender] += sharesMinted;
        principal[msg.sender] += amount;

        emit LiquidityAdded(msg.sender, amount, sharesMinted);
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
        if (block.timestamp >= scheduledArrival) revert MarketClosed();
        if (collateralIn == 0) revert ZeroAmount();
        if (_requiresPass(want) && !passes.isPassenger(flightId, msg.sender)) {
            revert NotPassenger();
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

    function resolveVoid() external {
        if (!isOpen()) revert MarketAlreadyResolved();
        if (msg.sender != resolver) revert Unauthorized();

        voided = true;
        emit Voided();
    }

    function refund() external nonReentrant returns (uint256 amountOut) {
        if (!voided) revert MarketNotResolved();

        amountOut = contributions[msg.sender];
        if (amountOut == 0) revert NothingToRedeem();

        contributions[msg.sender] = 0;
        collateral.safeTransfer(msg.sender, amountOut);

        emit Refunded(msg.sender, amountOut);
    }

    function redeem() external nonReentrant returns (uint256 amountOut) {
        if (!resolved || voided) revert MarketNotResolved();

        uint256 winningId = _winningId();
        amountOut = outcome.balanceOf(msg.sender, winningId);
        if (amountOut == 0) revert NothingToRedeem();

        outcome.burn(msg.sender, winningId, amountOut);
        collateral.safeTransfer(msg.sender, amountOut);

        emit Redeemed(msg.sender, amountOut, amountOut);
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

    function _requiresPass(Outcome want) private view returns (bool) {
        return
            kind == MarketKind.Protection && want == Outcome.Delayed
                && address(passes) != address(0);
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
