const { assert, expect } = require("chai");
const { ethers, network, getNamedAccounts, deployments } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat.config");

developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Lottery staging tests", function () {
      let lottery, entranceFee, deployer;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        lottery = await ethers.getContract("Lottery", deployer);
        entranceFee = await lottery.getEntranceFee();
      });

      describe("fullfillRandomWords() test", function () {
        it("Works with live chainlink keepers and chainlink VRF", async function () {
          const startingTimeStamp = await lottery.getLatestTimeStamp();
          const accounts = await ethers.getSigners();
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              try {
                const recentWinner = await lottery.getLatestWinner();
                const lotteryState = await lottery.getLotteryState();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimeStamp = await lottery.getLatestTimeStamp();

                await expect(lottery.getPlayerAtIndex(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(lotteryState.toString(), "0");
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(entranceFee).toString()
                );
                assert(endingTimeStamp > startingTimeStamp);
              } catch (e) {
                console.log(e);
                reject(e);
              }
              resolve();
            });

            await lottery.enterLottery({ value: entranceFee });
            const winnerStartingBalance = await accounts[0].getBalance();
          });
        });
      });
    });
