const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
  VERIFICATION_BLOCK_CONFIRMATIONS,
} = require("../helper-hardhat.config");
const { verify } = require("../utils/verify.js");

const VRF_SUBSCRIPTION_FUND_AMOUNT = 3;

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vrfCoordinatorV2_address, subscriptionId;

  if (developmentChains.includes(network.name)) {
    // console.log(networkConfig[chainId]["entranceFee"]);
    const vrfCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    );
    vrfCoordinatorV2_address = vrfCoordinatorV2Mock.address;

    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId;
    await vrfCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUBSCRIPTION_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2_address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  const gasLane = networkConfig[chainId]["gasLane"];
  const entranceFee = networkConfig[chainId]["entranceFee"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  args = [
    vrfCoordinatorV2_address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  const lottery = await deploy("Lottery", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...");
    await verify(lottery.address, args);
  }
};
module.exports.tags = ["all", "Lottery"];
