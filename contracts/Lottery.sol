// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

error Lottery__InsufficientFund();

contract Lottery {
    uint private immutable i_entranceFee;
    address payable[] private s_players;

    constructor(uint256 entranceFee) {
        i_entranceFee = entranceFee;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__InsufficientFund();
        }
        s_players.push(payable(msg.sender));
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }
}
