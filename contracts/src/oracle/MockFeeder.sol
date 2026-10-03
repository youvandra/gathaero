// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { FlightOracleConsumer } from "./FlightOracleConsumer.sol";

contract MockFeeder is Ownable {
    FlightOracleConsumer public immutable consumer;

    event Fed(bytes32 indexed flightId, int32 delayMinutes);

    constructor(address consumer_, address owner_) Ownable(owner_) {
        consumer = FlightOracleConsumer(consumer_);
    }

    function feed(bytes32 flightId, int32 delayMinutes, bool finalized) external onlyOwner {
        consumer.postResolution(flightId, delayMinutes, finalized);
        emit Fed(flightId, delayMinutes);
    }
}
