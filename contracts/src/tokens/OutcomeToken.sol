// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

import { NotTransferable, Unauthorized } from "../lib/Errors.sol";

contract OutcomeToken is ERC1155 {
    uint256 public constant ON_TIME = 0;
    uint256 public constant DELAYED = 1;

    address public immutable market;

    error NotMarket();

    modifier onlyMarket() {
        if (msg.sender != market) revert NotMarket();
        _;
    }

    constructor(address market_, string memory uri_) ERC1155(uri_) {
        if (market_ == address(0)) revert Unauthorized();
        market = market_;
    }

    function mint(address to, uint256 id, uint256 amount) external onlyMarket {
        _mint(to, id, amount, "");
    }

    function burn(address from, uint256 id, uint256 amount) external onlyMarket {
        _burn(from, id, amount);
    }

    function transferOut(address to, uint256 id, uint256 amount) external onlyMarket {
        safeTransferFrom(market, to, id, amount, "");
    }

    /// Positions stay with the wallet that bought them, so a verified passenger cannot pass
    /// exposure on to someone who is not on the flight. Only the market moves tokens.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        if (from != address(0) && to != address(0) && from != market && to != market) {
            revert NotTransferable();
        }
        super._update(from, to, ids, values);
    }
}
