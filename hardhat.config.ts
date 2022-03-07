import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
// import "hardhat-gas-reporter";
import "hardhat-deploy";
// import "@nomiclabs/hardhat-etherscan";
import { HardhatUserConfig } from "hardhat/config";
// import networks from './networks';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Go to https://hardhat.org/config/ to learn more
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  namedAccounts: {
    deployer: 0,
    purchaser: 0,
  },
  solidity: {
    version: "0.8.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 100,
      },
    },
  },
  external: {
    contracts: [
      // OLTA EDITIONS AUCTION
      {
        artifacts: process.env.PATH_TO_EDITIONS_AUCTION + "artifacts",
        deploy: process.env.PATH_TO_EDITIONS_AUCTION + "deploy"
      },
      // OLTA NFT EDITIONS
      {
        artifacts: process.env.PATH_TO_NFT_EDITIONS + "artifacts",
        deploy: process.env.PATH_TO_NFT_EDITIONS + "deploy"
      },
    ],
    deployments : {
      localhost: ["./deployments"]
    }
  }
};

export default config;