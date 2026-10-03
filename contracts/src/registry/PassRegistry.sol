// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import { IPassRegistry } from "../interfaces/IPassRegistry.sol";
import { PassAlreadyUsed, PassExpired, Unauthorized, ZeroAddress } from "../lib/Errors.sol";

contract PassRegistry is IPassRegistry, EIP712, Ownable {
    bytes32 public constant PASS_TYPEHASH =
        keccak256("Pass(bytes32 flightId,address wallet,bytes32 passHash,uint64 expiry)");

    address public verifier;
    mapping(bytes32 => mapping(address => bool)) private _passengers;
    mapping(bytes32 => address) public holderOf;

    event VerifierUpdated(address indexed verifier);
    event PassRegistered(bytes32 indexed flightId, address indexed wallet, bytes32 passHash);

    constructor(address owner_, address verifier_) EIP712("Gathaero", "1") Ownable(owner_) {
        if (verifier_ == address(0)) revert ZeroAddress();
        verifier = verifier_;
        emit VerifierUpdated(verifier_);
    }

    function setVerifier(address verifier_) external onlyOwner {
        if (verifier_ == address(0)) revert ZeroAddress();
        verifier = verifier_;
        emit VerifierUpdated(verifier_);
    }

    function register(bytes32 flightId, bytes32 passHash, uint64 expiry, bytes calldata signature)
        external
    {
        if (block.timestamp > expiry) revert PassExpired();

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(PASS_TYPEHASH, flightId, msg.sender, passHash, expiry))
        );
        if (ECDSA.recover(digest, signature) != verifier) revert Unauthorized();

        address holder = holderOf[passHash];
        if (holder != address(0) && holder != msg.sender) revert PassAlreadyUsed();

        holderOf[passHash] = msg.sender;
        _passengers[flightId][msg.sender] = true;
        emit PassRegistered(flightId, msg.sender, passHash);
    }

    function isPassenger(bytes32 flightId, address wallet) external view returns (bool) {
        return _passengers[flightId][wallet];
    }
}
