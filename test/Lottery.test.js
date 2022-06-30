const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat.config");

!developmentChains.includes(network.name)
  ? describe.skip()
  : describe("Lottery unit tests", function () {
      let lottery, deployer, vrfCoordinatorV2Mock, entranceFee, interval;

      beforeEach(async () => {
        deployer = (await getNamedAccounts())["deployer"];
        await deployments.fixture("all");
        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        interval = await lottery.getInterval();
        entranceFee = await lottery.getEntranceFee();
      });

      describe("Lottery Constructor", function () {
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

      describe("enterLottery()", function () {
        it("It reverts if msg.value is less than entranceFee", async function () {
          const sendValue = ethers.utils.parseEther("0.00001");
          await expect(
            lottery.enterLottery({ value: sendValue })
          ).to.be.revertedWith("Lottery__InsufficientFund");
        });

        it("It updates s_players array when a player enters lottery", async function () {
          const entranceFee = await lottery.getEntranceFee();
          await lottery.enterLottery({ value: entranceFee });
          const newPlayer = await lottery.getPlayerAtIndex(0);
          assert.equal(newPlayer, deployer);
        });

        it("It reverts when player tries to enter while in CALCULATING state", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);
          await expect(
            lottery.enterLottery({ value: entranceFee })
          ).to.be.revertedWith("Lottery_NotOpen");
        });

        it("Emits event on enter", async function () {
          await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
            lottery,
            "lotteryEntered"
          );
        });
      });

      describe("checkUpkeep", function () {
        it("It returns false if contract's balance is 0", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upKeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert(!upKeepNeeded);
        });

        it("It returns false if Lottery is not OPEN", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep("0x");
          const { upKeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert.equal((await lottery.getLotteryState()).toString(), "1");
          assert(!upKeepNeeded);
        });

        it("It returns false if time interval hasn't passed", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 1,
          ]);
          await network.provider.send("evm_mine", []);
          const upKeepNeeded = (await lottery.callStatic.checkUpkeep("0x"))[
            "upKeepNeeded"
          ];
          assert(!upKeepNeeded);
        });

        it("It returns true if all conditions are satisfied", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upKeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert(upKeepNeeded);
        });
      });

      describe("performUpKeep", function () {
        it("Works only if checkUpkeep returns true", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          let tx = await lottery.performUpkeep([]);
          assert(tx);
        });

        it("It reverts when checkUpkeep returns false", async function () {
          await expect(lottery.performUpkeep([])).to.be.revertedWith(
            "Lottery_UpKeepNotNeeded"
          );
        });

        it("It updates lotteryState, emits an event and calls VRF coordinator", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await lottery.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);

          const requestId = txReceipt.events[1].args.requestId;
          const lotteryState = await lottery.getLotteryState();
          assert(requestId.toNumber() > 0);
          assert.equal(lotteryState.toString(), "1");
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });
      });
    });
