// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { FlightOracleConsumer } from "./FlightOracleConsumer.sol";
import { Unauthorized, UnknownWorkflow, ZeroAddress } from "../lib/Errors.sol";

interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}

contract FlightOracleReceiver is IReceiver, Ownable {
    uint256 private constant WORKFLOW_OWNER_OFFSET = 42;
    uint256 private constant METADATA_LENGTH = 62;

    FlightOracleConsumer public immutable consumer;
    address public forwarder;
    address public workflowOwner;

    event ForwarderUpdated(address indexed forwarder);
    event WorkflowOwnerUpdated(address indexed workflowOwner);
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

    function setWorkflowOwner(address workflowOwner_) external onlyOwner {
        workflowOwner = workflowOwner_;
        emit WorkflowOwnerUpdated(workflowOwner_);
    }

    function onReport(bytes calldata metadata, bytes calldata report) external {
        if (msg.sender != forwarder) revert Unauthorized();
        if (workflowOwner == address(0) || _workflowOwnerOf(metadata) != workflowOwner) {
            revert UnknownWorkflow();
        }
        (bytes32 flightId, int32 delayMinutes, bool finalized) =
            abi.decode(report, (bytes32, int32, bool));
        consumer.postResolution(flightId, delayMinutes, finalized);
        emit ReportHandled(flightId, delayMinutes);
    }

    function _workflowOwnerOf(bytes calldata metadata) private pure returns (address) {
        if (metadata.length < METADATA_LENGTH) return address(0);
        return address(bytes20(metadata[WORKFLOW_OWNER_OFFSET:METADATA_LENGTH]));
    }
}
