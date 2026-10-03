// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IFlightOracle } from "../interfaces/IFlightOracle.sol";
import { Resolution } from "../types/FlightTypes.sol";
import { AlreadyFinalized, Unauthorized, ZeroAddress } from "../lib/Errors.sol";

contract FlightOracleConsumer is IFlightOracle, Ownable {
    mapping(address => bool) public reporters;
    mapping(bytes32 => Resolution) private _resolutions;

    event ReporterUpdated(address indexed reporter, bool allowed);
    event ResolutionPosted(bytes32 indexed flightId, int32 delayMinutes, bool finalized);

    constructor(address owner_, address reporter_) Ownable(owner_) {
        if (owner_ == address(0) || reporter_ == address(0)) revert ZeroAddress();
        reporters[reporter_] = true;
        emit ReporterUpdated(reporter_, true);
    }

    function setReporter(address reporter, bool allowed) external onlyOwner {
        if (reporter == address(0)) revert ZeroAddress();
        reporters[reporter] = allowed;
        emit ReporterUpdated(reporter, allowed);
    }

    function postResolution(bytes32 flightId, int32 delayMinutes, bool finalized) external {
        if (!reporters[msg.sender]) revert Unauthorized();
        if (_resolutions[flightId].finalized) revert AlreadyFinalized();
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
