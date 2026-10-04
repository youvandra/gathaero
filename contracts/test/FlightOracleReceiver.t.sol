// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Test } from "forge-std/Test.sol";

import { FlightOracleConsumer } from "../src/oracle/FlightOracleConsumer.sol";
import { FlightOracleReceiver } from "../src/oracle/FlightOracleReceiver.sol";
import { Unauthorized, UnknownWorkflow } from "../src/lib/Errors.sol";

contract FlightOracleReceiverTest is Test {
    bytes32 internal constant FLIGHT_ID = keccak256("SQ956-2026-10-01");

    FlightOracleConsumer internal oracle;
    FlightOracleReceiver internal receiver;

    address internal forwarder = address(0xF0);
    address internal stranger = address(0xCAFE);

    function setUp() public {
        oracle = new FlightOracleConsumer(address(this), address(this));
        receiver = new FlightOracleReceiver(address(this), address(oracle), forwarder);
        oracle.setReporter(address(receiver), true);
    }

    function test_ForwarderReportReachesConsumer() public {
        receiver.setWorkflowOwner(address(0xBEEF));
        bytes memory report = abi.encode(FLIGHT_ID, int32(150), true);
        vm.prank(forwarder);
        receiver.onReport(_metadata(address(0xBEEF)), report);

        (int32 delayMinutes, bool finalized) = oracle.resolution(FLIGHT_ID);
        assertEq(delayMinutes, 150);
        assertTrue(finalized);
    }

    function test_NonForwarderRejected() public {
        bytes memory report = abi.encode(FLIGHT_ID, int32(150), true);
        vm.prank(stranger);
        vm.expectRevert(Unauthorized.selector);
        receiver.onReport("", report);
    }

    function _metadata(address owner) internal pure returns (bytes memory) {
        return abi.encodePacked(bytes32("workflow"), bytes10("gathaero"), owner);
    }

    function test_ReportsRejectedUntilWorkflowOwnerSet() public {
        bytes memory report = abi.encode(FLIGHT_ID, int32(150), true);
        vm.prank(forwarder);
        vm.expectRevert(UnknownWorkflow.selector);
        receiver.onReport(_metadata(address(0xBEEF)), report);
    }

    function test_WorkflowOwnerEnforced() public {
        address workflowOwner = address(0xBEEF);
        receiver.setWorkflowOwner(workflowOwner);
        bytes memory report = abi.encode(FLIGHT_ID, int32(150), true);

        vm.prank(forwarder);
        vm.expectRevert(UnknownWorkflow.selector);
        receiver.onReport(_metadata(stranger), report);

        vm.prank(forwarder);
        receiver.onReport(_metadata(workflowOwner), report);
        (, bool finalized) = oracle.resolution(FLIGHT_ID);
        assertTrue(finalized);
    }
}
