# Olta edtions subgraph [WIP]

Aim: to index all the neccercery smartcontract states for olta's editions and auctions

## TODO's:
- [ ] organise so it's easy to test locally with hardhat node
  - [ ] start local env script (graph node, hardhat node)
  - [ ] import needed contracts (needs to be easily updatable)
  - [ ] deploy contracts
- [ ] editionsAuction
- [ ] editionToken
- [ ] editionTokenCreator
- [ ] users


---

## Notes for testing locally

### editions-auction repo
- start hardhat node `yarn hardhat node --hostname 0.0.0.0`
- deploy contracts to node `yarn hardhat --network localhost deploy`

### graph-node repo
- setup (one time)
  `cd docker`
  `./setup`
  changes docker-compose.yml file -> ethereum: 'mainnet:http://172.18.0.1:8545')
  NOTE: this ip address can change see the README.md file in docker folder to get the correct address if setup doesn't do the job.

- start graph node
  `cd docker`
  `sudo docker-compose up`

- When using hardhat the blockhashes change so I found I needed to delete docker/data if the hardhat node changes
  `cd docker`
  `sudo rm -r -f data`