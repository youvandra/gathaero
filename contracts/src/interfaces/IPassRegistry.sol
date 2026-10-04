// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface IPassRegistry {
    function isPassenger(bytes32 flightId, address wallet) external view returns (bool);

    function recordStake(bytes32 flightId, address wallet, uint256 amount) external;
}
