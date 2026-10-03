// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFlightRegistry } from "../interfaces/IFlightRegistry.sol";
import { Flight } from "../types/FlightTypes.sol";
import { FlightExists, FlightUnknown, InvalidRange, ZeroAddress } from "../lib/Errors.sol";

contract FlightRegistry is IFlightRegistry, Ownable {
    mapping(bytes32 => Flight) private _flights;
    mapping(bytes32 => bool) private _known;
    bytes32[] private _ids;

    event FlightRegistered(
        bytes32 indexed flightId,
        string number,
        string route,
        uint64 scheduledDeparture,
        uint64 scheduledArrival,
        uint16 delayThresholdMinutes
    );

    constructor(address owner_) Ownable(owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
    }

    function registerFlight(
        bytes32 flightId,
        string calldata number,
        string calldata route,
        uint64 scheduledDeparture,
        uint64 scheduledArrival,
        uint16 delayThresholdMinutes
    ) external onlyOwner {
        if (_known[flightId]) revert FlightExists();
        if (scheduledDeparture >= scheduledArrival) revert InvalidRange();
        _flights[flightId] =
            Flight(number, route, scheduledDeparture, scheduledArrival, delayThresholdMinutes);
        _known[flightId] = true;
        _ids.push(flightId);
        emit FlightRegistered(
            flightId, number, route, scheduledDeparture, scheduledArrival, delayThresholdMinutes
        );
    }

    function getFlight(bytes32 flightId) external view returns (Flight memory) {
        if (!_known[flightId]) revert FlightUnknown();
        return _flights[flightId];
    }

    function exists(bytes32 flightId) external view returns (bool) {
        return _known[flightId];
    }

    function flightIds() external view returns (bytes32[] memory) {
        return _ids;
    }
}
