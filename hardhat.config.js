/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("dotenv").config();

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL;
const PRIVATE_KEY = process.env.RINKEBY_PRIVATE_KEY;

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    rinkeby: {
      chainId: 4,
      blockConfirmation: 6,
      url: RINKEBY_RPC_URL,
      accounts: [PRIVATE_KEY],
    },
    localhost: {},
  },
  solidity: "0.8.8",
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
};
