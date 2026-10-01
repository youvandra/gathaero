// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IFlightOracle {
    function resolution(bytes32 flightId) external view returns (int32 delayMinutes, bool finalized);
}
