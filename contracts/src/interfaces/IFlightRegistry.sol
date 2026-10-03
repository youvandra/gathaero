// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Flight } from "../types/FlightTypes.sol";

interface IFlightRegistry {
    function registerFlight(
        bytes32 flightId,
        string calldata number,
        string calldata route,
        uint64 scheduledArrival,
        uint16 delayThresholdMinutes
    ) external;

    function getFlight(bytes32 flightId) external view returns (Flight memory);

    function exists(bytes32 flightId) external view returns (bool);

    function flightIds() external view returns (bytes32[] memory);
}
