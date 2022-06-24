# Olta Editions Subgraph [WIP]

Aims:
  1. to index all the necessary smart contract states for olta's editions and editions auction
  2. to be accessible from within an olta artwork so that the nft's can be self aware

This is a work in progress and not yet deployed if you would like to contribute please feel to reach out on [Olta's discord](https://discord.gg/wnj2qW8pH6) pull requests are very welcome.

## TODO 🛠️

- [ ] tests
- [x] mumbai deployment
- [ ] polygon deployment

---

## Mumbai Deployment

**Warning: this subgraph indexes smart-contracts that are still in development, it is likely there will be breaking changes**

Explore the mumbai subgraph [here](https://api.thegraph.com/subgraphs/name/olta-art/olta-editions-mumbai/graphql)

**hint:**

    clicking the explorer button in the top left allows you to quickly construct queries. The docs button on the top right gives you more detailed explanation of the schema

deployment details and logs can be found [here](https://thegraph.com/hosted-service/subgraph/olta-art/olta-editions-mumbai)

---
## How to setup locally

The contracts are still WIP and because of that I have made a setup that allows to pull the abis from the repos. This is likely to be simplified once contracts are solid.

### 1. setup .env file

`RPC_ENDPOINT` can be set to http://0.0.0.0:8545
`PATH_TO_GRAPH` path to local graph node repo
`PATH_TO_NFT_EDITIONS` and `PATH_TO_EDITIONS_AUCTION` set to paths for related repos. hardhat will pull artefacts and deployments of the contracts from there.

### 2. generate needed folders
There is a number of generated folders to be able to test and deploy to the local graph node. The order is important!

- run `yarn start-local-node` to start a local hardhat node. this creates a deployments/localhost folder with all the needed abis

- run `yarn typechain` generates `typechain` for ethers.js to work with (used for tests and seeding scripts) uses abis from deployments/localhost

- run `yarn prepare:local` to generate the subgraph.yaml from subgraph.template.yaml using the config/50.json

- run `yarn codegen` generates `types` for the graph

### 3. start local graph node
from within the graph-node repo
- setup (one time)
  `cd docker`
  `./setup`
  changes docker-compose.yml file -> ethereum: 'mainnet:http://172.18.0.1:8545')
  NOTE: this ip address can change see the README.md file in docker folder to get the correct address if setup doesn't do the job.

- start graph node
  `cd docker`
  `docker-compose up --force-recreate`

  The `--force-recreate`` tag should mean removing the /data folder is not needed.

- If however you still run into problems with left over data and errors such as "ERRO the genesis block hash for chain mainnet has changed from..." try deleting the generated data folder and restarting the node.
  `cd docker`
  `sudo rm -r -f data`

NOTE: From address seems to be blank on minting tokens, may to set it in hardhat config to "0x0000000000000000000000000000000000000000"?

### 4. deploy subgraph
- run `yarn prepare:local` uses subgraph.template.yaml and config>50.json to generate `subgraph.yaml`
- run `yarn create-local` creates a subgraph on local node
- run `yarn deploy-local` deploys local subgraph to local graph node


### 5. seed the local hardhat node
- run `yarn seed-local-node` creates some data to populate the graph.

### Updating
- if the contracts change you can regenerate everything by deleting the deployment repo and running through the steps again.