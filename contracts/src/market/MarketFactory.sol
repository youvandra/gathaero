// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFlightOracle } from "../interfaces/IFlightOracle.sol";
import { IFlightRegistry } from "../interfaces/IFlightRegistry.sol";
import { FlightMarket } from "./FlightMarket.sol";
import { FlightUnknown, MarketExists, ZeroAddress } from "../lib/Errors.sol";

contract MarketFactory is Ownable {
    address public immutable collateral;
    IFlightOracle public immutable oracle;
    IFlightRegistry public immutable registry;
    string public baseUri;

    mapping(bytes32 => address) private _markets;

    event MarketCreated(bytes32 indexed flightId, address market, uint16 delayThresholdMinutes);
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
        ) revert ZeroAddress();
        collateral = collateral_;
        oracle = IFlightOracle(oracle_);
        registry = IFlightRegistry(registry_);
        baseUri = baseUri_;
    }

    function setBaseUri(string calldata baseUri_) external onlyOwner {
        baseUri = baseUri_;
        emit BaseUriUpdated(baseUri_);
    }

    function createMarket(bytes32 flightId, uint16 delayThresholdMinutes)
        external
        onlyOwner
        returns (address market)
    {
        if (_markets[flightId] != address(0)) revert MarketExists();
        if (!registry.exists(flightId)) revert FlightUnknown();

        market = address(
            new FlightMarket(collateral, address(oracle), flightId, delayThresholdMinutes, baseUri)
        );
        _markets[flightId] = market;

        emit MarketCreated(flightId, market, delayThresholdMinutes);
    }

    function marketOf(bytes32 flightId) external view returns (address) {
        return _markets[flightId];
    }

    function isListed(bytes32 flightId) external view returns (bool) {
        return _markets[flightId] != address(0);
    }
}
