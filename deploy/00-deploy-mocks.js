const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat.config");
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  if (developmentChains.includes(network.name)) {
    log("Development chain detected ! \n Deploying mocks ...");
  }
};
