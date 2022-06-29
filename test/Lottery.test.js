const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat.config");

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Lottery unit tests", async () => {
      let lottery, vrfCoordinatorV2Mock;
      beforeEach(async () => {
        const { deployer } = await getNamedAccounts();
        await deployments.fixture("all");
        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
      });

      describe("Lottery Constructor", async function () {
        it("It initialized the contract with an open state", async function () {
          const state = await lottery.getLotteryState();
          assert.equal(state.toString(), "0");
        });

        it("It initialized the contract with the right interval", async function () {
          const interval = await lottery.getInterval();
          assert.equal(
            interval.toString(),
            networkConfig[network.config.chainId]["interval"]
          );
        });

        it("It initialized the contract with the right entrance fee", async function () {
          const entranceFee = await lottery.getEntranceFee();
          assert.equal(
            entranceFee.toString(),
            networkConfig[network.config.chainId]["entranceFee"]
          );
        });
      });

      describe("enterLottery()", async function () {
        it("It reverts if msg.value is less than entranceFee", async function () {
          const sendValue = ethers.utils.parseEther("0.00001");
          await expect(
            lottery.enterLottery({ value: sendValue })
          ).to.be.revertedWith("Lottery__InsufficientFund");
        });
      });
    });
