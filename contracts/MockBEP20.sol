// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./token/BEP20/BEP20.sol";

contract MockBEP20 is BEP20 {
    constructor(
        string memory name,
        string memory symbol,
        uint256 supply
    ) public BEP20(name, symbol, 18) {
        _mint(msg.sender, supply);
    }

    function mintTokens(uint256 _amount) external onlyOwner {
        _mint(msg.sender, _amount);
    }
}
