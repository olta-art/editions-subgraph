import {
  Transfer,
  SingleEditionMintable as SingleEditionMintableContract
} from '../types/templates/SingleEditionMintable/SingleEditionMintable'

import {
  Purchase,
} from '../types/schema'

import {
  findOrCreateToken,
  findOrCreateTokenContract,
  findOrCreateUser,
  zeroAddress
} from './helpers'

import { log, dataSource, Address } from '@graphprotocol/graph-ts'

// TODO: updateEditionURLsCall -> or update smart contract to emit event

export function handleTransfer(event: Transfer): void {
  let context = dataSource.context()
  const id = `${context.getString('tokenContract')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Transfer for token {}`, [id])

  // Handle Mint
  let from = event.params.from.toString()
  if(!from || (from == zeroAddress)){
    handleMint(event)
    log.info(`Completed handler for Transfer for token {}`, [id])
    return
  }

  let token = findOrCreateToken(id)
  token.owner = event.params.to.toHexString()
  token.prevOwner = event.params.from.toHexString()
  token.save()

  log.info(`Completed handler for Transfer for token {}`, [id])
}

function handleMint(event: Transfer): void {
  let context = dataSource.context()
  const id = `${context.getString('tokenContract')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Mint for token {}`, [id])
  let token = findOrCreateToken(id)

  token.id = id
  token.editionNumber = event.params.tokenId
  token.tokenContract = context.getString('tokenContract')
  token.owner = findOrCreateUser(event.params.to.toHexString()).id
  token.prevOwner = zeroAddress
  token.createdAtTransactionHash = event.transaction.hash.toHexString()
  token.createdAtTimestamp = event.block.timestamp
  token.createdAtBlockNumber = event.block.number

  // call tokenURI from tokenContract
  let tokenContractAddress = Address.fromString(context.getString('tokenContract'))
  let singleEditionMintableContract = SingleEditionMintableContract.bind(tokenContractAddress)
  let tokenURI = singleEditionMintableContract.tokenURI(event.params.tokenId)
  token.tokenURI = tokenURI

  token.save()

  // TODO: test/research to see if this ever gets missed as purchese needs to be indexed before
  // index token to purchase based on tx hash
  addTokenToPurchase(
    id,
    event.transaction.hash.toHexString()
  )

  // HACK: updates if no urls are indexed on tokenContract
  // NOTE: see SingleEditionMintableCreator for call method that does simular 
  addTokenURIsToTokenContract(
    context.getString('tokenContract'),
    singleEditionMintableContract
  )

  log.info(`Completed handler for Mint for token {}`, [id])
}

function addTokenToPurchase(tokenId: string,txHash: string): void {
  let purchase = Purchase.load(txHash)
  if(purchase != null){
    log.info(`Starting: add token to purchase`, [txHash])
    purchase.token = tokenId
    purchase.save()
    log.info(`Completed: add token to purchase`, [txHash])
  }
}

function addTokenURIsToTokenContract(tokenContractId: string, singleEditionMintableContract: SingleEditionMintableContract): void {
  let tokenContract = findOrCreateTokenContract(tokenContractId)
  if(!tokenContract.animationURL && !tokenContract.imageURL){
    log.info(`Starting: add tokenURIs to TokenContract`, [tokenContractId])

    // call getURIs from tokenContract
    let tokenURIs = singleEditionMintableContract.getURIs()

    // update tokenContract
    tokenContract.imageURL = tokenURIs.value0
    tokenContract.imageHash = tokenURIs.value1.toHexString()
    tokenContract.animationURL = tokenURIs.value2
    tokenContract.animationHash = tokenURIs.value3.toHexString()

    tokenContract.save()

    log.info(`Completed: add tokenURIs to TokenContract`, [tokenContractId])
  }
}