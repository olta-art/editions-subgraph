import "@typechain/hardhat"
import "@nomiclabs/hardhat-ethers"
// import "hardhat-gas-reporter";
import "hardhat-deploy";
// import "@nomiclabs/hardhat-etherscan";
import { HardhatUserConfig } from "hardhat/config";
// import networks from './networks';
import * as dotenv from 'dotenv';
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
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    externalArtifacts: [
      "./deployments/localhost/*.json",
      "./abis/Zora/*.json"
    ]
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
      // OLTA PROFILES
      {
        artifacts: process.env.PATH_TO_PROFILES + "artifacts",
        deploy: process.env.PATH_TO_PROFILES + "deploy"
      },
    ],
    deployments : {
      localhost: ["./deployments"]
    }
  }
};

export default config;