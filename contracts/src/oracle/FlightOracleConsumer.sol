// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFlightOracle } from "../interfaces/IFlightOracle.sol";
import { Resolution } from "../types/FlightTypes.sol";
import { Unauthorized, ZeroAddress } from "../lib/Errors.sol";

contract FlightOracleConsumer is IFlightOracle, Ownable {
    address public reporter;

    mapping(bytes32 => Resolution) private _resolutions;

    event ReporterUpdated(address indexed reporter);
    event ResolutionPosted(bytes32 indexed flightId, int32 delayMinutes, bool finalized);

    constructor(address owner_, address reporter_) Ownable(owner_) {
        if (owner_ == address(0) || reporter_ == address(0)) revert ZeroAddress();
        reporter = reporter_;
        emit ReporterUpdated(reporter_);
    }

    function setReporter(address reporter_) external onlyOwner {
        if (reporter_ == address(0)) revert ZeroAddress();
        reporter = reporter_;
        emit ReporterUpdated(reporter_);
    }

    function postResolution(bytes32 flightId, int32 delayMinutes, bool finalized) external {
        if (msg.sender != reporter) revert Unauthorized();
        _resolutions[flightId] = Resolution(delayMinutes, finalized);
        emit ResolutionPosted(flightId, delayMinutes, finalized);
    }

    function resolution(bytes32 flightId)
        external
        view
        returns (int32 delayMinutes, bool finalized)
    {
        Resolution memory res = _resolutions[flightId];
        return (res.delayMinutes, res.finalized);
    }
}
