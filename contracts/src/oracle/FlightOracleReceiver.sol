// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { FlightOracleConsumer } from "./FlightOracleConsumer.sol";
import { Unauthorized, ZeroAddress } from "../lib/Errors.sol";

interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

contract FlightOracleReceiver is IReceiver, Ownable {
    FlightOracleConsumer public immutable consumer;
    address public forwarder;

    event ForwarderUpdated(address indexed forwarder);
    event ReportHandled(bytes32 indexed flightId, int32 delayMinutes);

    constructor(address owner_, address consumer_, address forwarder_) Ownable(owner_) {
        if (owner_ == address(0) || consumer_ == address(0)) revert ZeroAddress();
        consumer = FlightOracleConsumer(consumer_);
        forwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    function setForwarder(address forwarder_) external onlyOwner {
        forwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    function onReport(bytes calldata, bytes calldata report) external {
        if (msg.sender != forwarder) revert Unauthorized();
        (bytes32 flightId, int32 delayMinutes, bool finalized) =
            abi.decode(report, (bytes32, int32, bool));
        consumer.postResolution(flightId, delayMinutes, finalized);
        emit ReportHandled(flightId, delayMinutes);
    }
}
