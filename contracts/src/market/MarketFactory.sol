// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFlightOracle } from "../interfaces/IFlightOracle.sol";
import { IFlightRegistry } from "../interfaces/IFlightRegistry.sol";
import { FlightMarket } from "./FlightMarket.sol";
import { Flight, MarketKind } from "../types/FlightTypes.sol";
import { MarketExists, ZeroAddress } from "../lib/Errors.sol";

contract MarketFactory is Ownable {
    address public immutable collateral;
    IFlightOracle public immutable oracle;
    IFlightRegistry public immutable registry;
    string public baseUri;

    mapping(bytes32 => address) private _protection;
    mapping(bytes32 => mapping(uint64 => address)) private _threshold;
    mapping(bytes32 => address) private _ranges;

    event MarketCreated(bytes32 indexed flightId, address market, MarketKind kind, uint64 param);
    event BaseUriUpdated(string baseUri);

    constructor(
        address owner_,
        address collateral_,
        address oracle_,
        address registry_,
        string memory baseUri_
    ) Ownable(owner_) {
        if (
            owner_ == address(0) || collateral_ == address(0) || oracle_ == address(0)
                || registry_ == address(0)
        ) {
            revert ZeroAddress();
        }
        collateral = collateral_;
        oracle = IFlightOracle(oracle_);
        registry = IFlightRegistry(registry_);
        baseUri = baseUri_;
    }

    function setBaseUri(string calldata baseUri_) external onlyOwner {
        baseUri = baseUri_;
        emit BaseUriUpdated(baseUri_);
    }

    function createProtection(bytes32 flightId) external onlyOwner returns (address market) {
        if (_protection[flightId] != address(0)) revert MarketExists();

        Flight memory flight = registry.getFlight(flightId);
        market = address(
            new FlightMarket(
                collateral,
                address(oracle),
                flightId,
                MarketKind.Protection,
                flight.delayThresholdMinutes,
                flight.scheduledArrival,
                0,
                0,
                0,
                baseUri
            )
        );
        _protection[flightId] = market;

        emit MarketCreated(flightId, market, MarketKind.Protection, flight.delayThresholdMinutes);
    }

    function createThreshold(bytes32 flightId, uint64 strikeArrival)
        external
        onlyOwner
        returns (address market)
    {
        if (_threshold[flightId][strikeArrival] != address(0)) revert MarketExists();

        Flight memory flight = registry.getFlight(flightId);
        market = address(
            new FlightMarket(
                collateral,
                address(oracle),
                flightId,
                MarketKind.Threshold,
                flight.delayThresholdMinutes,
                flight.scheduledArrival,
                strikeArrival,
                0,
                0,
                baseUri
            )
        );
        _threshold[flightId][strikeArrival] = market;

        emit MarketCreated(flightId, market, MarketKind.Threshold, strikeArrival);
    }

    function createRange(bytes32 flightId, uint64 lower, uint64 upper)
        external
        onlyOwner
        returns (address market)
    {
        require(upper > lower, "Invalid range");
        bytes32 key = rangeKey(flightId, lower, upper);
        if (_ranges[key] != address(0)) revert MarketExists();

        Flight memory flight = registry.getFlight(flightId);
        market = address(
            new FlightMarket(
                collateral,
                address(oracle),
                flightId,
                MarketKind.Range,
                flight.delayThresholdMinutes,
                flight.scheduledArrival,
                0,
                lower,
                upper,
                baseUri
            )
        );
        _ranges[key] = market;

        emit MarketCreated(flightId, market, MarketKind.Range, upper);
    }

    function rangeKey(bytes32 flightId, uint64 lower, uint64 upper) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(flightId, lower, upper));
    }

    function marketOf(bytes32 flightId) external view returns (address) {
        return _protection[flightId];
    }

    function thresholdMarketOf(bytes32 flightId, uint64 strikeArrival)
        external
        view
        returns (address)
    {
        return _threshold[flightId][strikeArrival];
    }

    function rangeMarketOf(bytes32 flightId, uint64 lower, uint64 upper)
        external
        view
        returns (address)
    {
        return _ranges[rangeKey(flightId, lower, upper)];
    }

    function isListed(bytes32 flightId) external view returns (bool) {
        return _protection[flightId] != address(0);
    }
}
