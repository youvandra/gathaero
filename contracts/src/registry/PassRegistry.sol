// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import { IPassRegistry } from "../interfaces/IPassRegistry.sol";
import {
    PassAlreadyUsed,
    PassExpired,
    StakeLimitExceeded,
    Unauthorized,
    ZeroAddress
} from "../lib/Errors.sol";

interface IMarketDirectory {
    function isMarket(address market) external view returns (bool);
}

contract PassRegistry is IPassRegistry, EIP712, Ownable {
    bytes32 public constant PASS_TYPEHASH =
        keccak256("Pass(bytes32 flightId,address wallet,bytes32 passHash,uint64 expiry)");

    /// Most a passenger can put on their own flight, across every market on it: about a
    /// ticket's worth of 6-decimal USDG. It keeps positions sized as a hedge, so causing a
    /// delay never pays.
    uint256 public constant MAX_STAKE = 200e6;

    address public verifier;
    IMarketDirectory public markets;
    mapping(bytes32 => mapping(address => uint256)) public staked;
    mapping(bytes32 => mapping(address => bool)) private _passengers;
    mapping(bytes32 => address) public holderOf;

    event VerifierUpdated(address indexed verifier);
    event MarketsUpdated(address indexed markets);
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

    function setMarkets(address markets_) external onlyOwner {
        if (markets_ == address(0)) revert ZeroAddress();
        markets = IMarketDirectory(markets_);
        emit MarketsUpdated(markets_);
    }

    /// Called by a listed market on every passenger buy; the cap spans the whole flight.
    function recordStake(bytes32 flightId, address wallet, uint256 amount) external {
        if (address(markets) == address(0) || !markets.isMarket(msg.sender)) revert Unauthorized();
        uint256 total = staked[flightId][wallet] + amount;
        if (total > MAX_STAKE) revert StakeLimitExceeded();
        staked[flightId][wallet] = total;
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
