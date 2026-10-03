// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFlightRegistry } from "../interfaces/IFlightRegistry.sol";
import { FlightMarket } from "../market/FlightMarket.sol";
import { MarketFactory } from "../market/MarketFactory.sol";
import { Flight, MarketKind, Outcome } from "../types/FlightTypes.sol";

struct MarketView {
    address market;
    MarketKind kind;
    uint64 lowerBound;
    uint64 upperBound;
    uint256 reserveOnTime;
    uint256 reserveDelayed;
    uint256 delayedProbability;
    uint256 volume;
    uint256 locked;
    bool resolved;
    bool voided;
    Outcome winning;
}

struct FlightView {
    bytes32 flightId;
    string number;
    string route;
    uint64 scheduledDeparture;
    uint64 scheduledArrival;
    uint16 delayThresholdMinutes;
    int32 delayMinutes;
    bool finalized;
    MarketView protection;
    MarketView[] ranges;
}

struct PositionView {
    address market;
    bytes32 flightId;
    string number;
    MarketKind kind;
    uint64 lowerBound;
    uint64 upperBound;
    uint256 onTimeBalance;
    uint256 delayedBalance;
    uint256 lpShares;
    uint256 lpValue;
    uint256 contribution;
    uint256 delayedProbability;
    bool resolved;
    bool voided;
    Outcome winning;
}

contract MarketLens {
    MarketFactory public immutable factory;

    constructor(MarketFactory factory_) {
        factory = factory_;
    }

    function flights() external view returns (FlightView[] memory views) {
        bytes32[] memory ids = factory.registry().flightIds();
        views = new FlightView[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            views[i] = flight(ids[i]);
        }
    }

    function flight(bytes32 flightId) public view returns (FlightView memory view_) {
        Flight memory info = factory.registry().getFlight(flightId);
        (int32 delayMinutes, bool finalized) = factory.oracle().resolution(flightId);

        view_.flightId = flightId;
        view_.number = info.number;
        view_.route = info.route;
        view_.scheduledDeparture = info.scheduledDeparture;
        view_.scheduledArrival = info.scheduledArrival;
        view_.delayThresholdMinutes = info.delayThresholdMinutes;
        view_.delayMinutes = delayMinutes;
        view_.finalized = finalized;

        address protection = factory.marketOf(flightId);
        if (protection != address(0)) view_.protection = marketView(protection);

        address[] memory ranges = factory.rangeMarketsOf(flightId);
        view_.ranges = new MarketView[](ranges.length);
        for (uint256 i; i < ranges.length; ++i) {
            view_.ranges[i] = marketView(ranges[i]);
        }
    }

    function marketView(address market) public view returns (MarketView memory view_) {
        FlightMarket m = FlightMarket(market);
        (uint256 reserveOnTime, uint256 reserveDelayed) = m.reserves();

        view_.market = market;
        view_.kind = m.kind();
        view_.lowerBound = m.lowerBound();
        view_.upperBound = m.upperBound();
        view_.reserveOnTime = reserveOnTime;
        view_.reserveDelayed = reserveDelayed;
        view_.delayedProbability = m.probability(Outcome.Delayed);
        view_.volume = m.volume();
        view_.locked = IERC20(factory.collateral()).balanceOf(market);
        view_.resolved = m.resolved();
        view_.voided = m.voided();
        view_.winning = m.winning();
    }

    function positionsOf(address user) external view returns (PositionView[] memory positions) {
        bytes32[] memory ids = factory.registry().flightIds();
        PositionView[] memory buffer = new PositionView[](_marketCount(ids));
        uint256 count;

        for (uint256 i; i < ids.length; ++i) {
            string memory number = factory.registry().getFlight(ids[i]).number;
            address protection = factory.marketOf(ids[i]);
            if (protection != address(0)) {
                count = _collect(buffer, count, protection, ids[i], number, user);
            }
            address[] memory ranges = factory.rangeMarketsOf(ids[i]);
            for (uint256 j; j < ranges.length; ++j) {
                count = _collect(buffer, count, ranges[j], ids[i], number, user);
            }
        }

        positions = new PositionView[](count);
        for (uint256 i; i < count; ++i) {
            positions[i] = buffer[i];
        }
    }

    function _collect(
        PositionView[] memory buffer,
        uint256 count,
        address market,
        bytes32 flightId,
        string memory number,
        address user
    ) private view returns (uint256) {
        FlightMarket m = FlightMarket(market);
        uint256 onTime = m.outcome().balanceOf(user, m.outcome().ON_TIME());
        uint256 delayed = m.outcome().balanceOf(user, m.outcome().DELAYED());
        uint256 lpShares = m.shares(user);
        uint256 contribution = m.contributions(user);
        if (onTime == 0 && delayed == 0 && lpShares == 0 && contribution == 0) return count;

        buffer[count] = PositionView({
            market: market,
            flightId: flightId,
            number: number,
            kind: m.kind(),
            lowerBound: m.lowerBound(),
            upperBound: m.upperBound(),
            onTimeBalance: onTime,
            delayedBalance: delayed,
            lpShares: lpShares,
            lpValue: lpShares == 0 ? 0 : _lpValue(m, user, lpShares),
            contribution: contribution,
            delayedProbability: m.probability(Outcome.Delayed),
            resolved: m.resolved(),
            voided: m.voided(),
            winning: m.winning()
        });
        return count + 1;
    }

    function _lpValue(FlightMarket m, address user, uint256 lpShares)
        private
        view
        returns (uint256)
    {
        if (m.voided()) return m.principal(user);

        (uint256 reserveOnTime, uint256 reserveDelayed) = m.reserves();
        uint256 totalShares = m.totalShares();
        if (m.resolved()) {
            uint256 reserveWinning = m.winning() == Outcome.Delayed ? reserveDelayed : reserveOnTime;
            return (lpShares * reserveWinning) / totalShares;
        }

        uint256 sum = reserveOnTime + reserveDelayed;
        if (sum == 0) return 0;
        uint256 poolValue = (2 * reserveOnTime * reserveDelayed) / sum;
        return (lpShares * poolValue) / totalShares;
    }

    function _marketCount(bytes32[] memory ids) private view returns (uint256 total) {
        for (uint256 i; i < ids.length; ++i) {
            if (factory.marketOf(ids[i]) != address(0)) ++total;
            total += factory.rangeMarketsOf(ids[i]).length;
        }
    }
}
