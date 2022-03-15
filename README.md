# Olta Editions Subgraph [WIP]

Aim: to index all the necessary smart contract states for olta's editions and editions auction

Also to be accessible from within an olta artwork so that the nft's can be self aware

## TODO 🛠️

- [ ] tests
- [ ] mock up a front end
- [ ] mock up a test artwork
- [ ] mumbai deployment
- [ ] polygon deployment

---

## How to setup locally

The contracts are still WIP and because of that I have made a setup that allows to pull the abis from the repos. This is likely to be simplified once contracts are solid.

### 1. setup .env file

`RPC_ENDPOINT` can be set to http://0.0.0.0:8545
`PATH_TO_GRAPH` path to local graph node repo
`PATH_TO_NFT_EDITIONS` and `PATH_TO_EDITIONS_AUCTION` set to paths for related repos. hardhat will pull artefacts and deployments of the contracts from there.

### 2. generate needed folders
There is a number of generated folders to be able to test and deploy to the local graph node. The order is important!

- run `yarn setup-local-node` to start a local hardhat node. this creates a deployments/localhost folder with all the needed abis

- run `yarn typechain` generates `typechain` for ethers.js to work with (used for tests and seeding scripts) uses abis from deployments/localhost

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
  `docker-compose up`

- When using hardhat the blockhashes change so I found I needed to delete docker/data if the hardhat node is restarted
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