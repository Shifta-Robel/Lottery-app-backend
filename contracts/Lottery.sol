// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

// Errors
error Lottery__InsufficientFund();
error Lottery_TransferFailed();
error Lottery_NotOpen();
error Lottery_UpKeepNotNeeded(
    uint256 lotteryBalance,
    uint256 numberOfPlayers,
    uint8 lotteryState
);

/**
 * @title Decentralized Lottery contract
 * @author Robel T.
 * @dev This implements chainlink VRF V2 and chainlink keepers
 */
contract Lottery is VRFConsumerBaseV2, KeeperCompatibleInterface {
    enum LotteryState {
        OPEN,
        CALCULATING
    }

    // immutables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint private immutable i_entranceFee;
    bytes32 private immutable i_keyHash;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callBackGasLimit;
    uint256 private immutable i_timeInterval;

    // constants
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // storage
    address payable[] private s_players;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimeStamp;
    address private s_latestWinner;

    /* Events */
    event lotteryEntered(address indexed player);
    event requestedWinner(uint256 indexed requestId);
    event winnerPicked(address indexed winner);

    constructor(
        address VRFCoordinatorV2,
        uint256 entranceFee,
        bytes32 keyHash,
        uint64 subscriptionId,
        uint32 callBackGasLimit,
        uint256 timeInterval
    ) VRFConsumerBaseV2(VRFCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(VRFCoordinatorV2);
        i_entranceFee = entranceFee;
        i_keyHash = keyHash;
        i_subscriptionId = subscriptionId;
        i_callBackGasLimit = callBackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimeStamp = block.timestamp;
        i_timeInterval = timeInterval;
    }

    function enterLottery() public payable {
        if (msg.value < i_entranceFee) {
            revert Lottery__InsufficientFund();
        }
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery_NotOpen();
        }
        s_players.push(payable(msg.sender));
        emit lotteryEntered(msg.sender);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (
            bool upKeepNeeded,
            bytes memory /* perform data */
        )
    {
        bool isOpen = s_lotteryState == LotteryState.OPEN;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) >
            i_timeInterval);
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upKeepNeeded = isOpen && timePassed && hasPlayers && hasBalance;
    }

    function performUpkeep(
        bytes calldata /* performdata */
    ) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Lottery_UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint8(s_lotteryState)
            );
        }
        s_lotteryState = LotteryState.CALCULATING;
        emit requestedWinner(
            i_vrfCoordinator.requestRandomWords(
                i_keyHash,
                i_subscriptionId,
                REQUEST_CONFIRMATIONS,
                i_callBackGasLimit,
                NUM_WORDS
            )
        );
    }

    function fulfillRandomWords(uint256, uint256[] memory randomWords)
        internal
        override
    {
        uint256 winnerIndex = randomWords[0] % s_players.length;
        address payable latestWinner = s_players[winnerIndex];
        s_latestWinner = latestWinner;

        (bool success, ) = latestWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery_TransferFailed();
        }
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        emit winnerPicked(latestWinner);
    }

    // view functions

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getLatestWinner() public view returns (address) {
        return s_latestWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getPlayerAtIndex(uint256 i) public view returns (address) {
        return s_players[i];
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_timeInterval;
    }
}
