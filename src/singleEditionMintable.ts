import {
  Transfer,
  SingleEditionMintable as SingleEditionMintableContract,
  VersionAdded,
  VersionURLUpdated
} from '../types/templates/SingleEditionMintable/SingleEditionMintable'

import {
  Purchase,
} from '../types/schema'

import {
  findOrCreateToken,
  findOrCreateTokenContract,
  findOrCreateUrlHashPair,
  findOrCreateUser,
  findOrCreateVersion,
  zeroAddress
} from './helpers'

import { log, dataSource, Address, BigInt } from '@graphprotocol/graph-ts'

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

  log.info(`Completed handler for Mint for token {}`, [id])
}

export function handleVersionAdded(event: VersionAdded): void {
  let context = dataSource.context()
  let tokenContractAddress = context.getString('tokenContract')

  let id = `${context.getString('tokenContract')}-${formatLabel(event.params.label)}`
  log.info(`Starting handler for VersionAdded for token {}`, [id])

  let version = findOrCreateVersion(id)

  version.id = id
  // version.label = formatLabel(event.params.label)
  version.tokenContract = tokenContractAddress
  version.createdAtBlockNumber = event.block.number
  version.createdAtTimestamp = event.block.timestamp

  version.save()

  // call getURIs of version to fetch uris for specifc for label
  const singleEditionMintableContract = SingleEditionMintableContract.bind(
    Address.fromString(context.getString('tokenContract'))
  )

  log.info("GEORGE BIZ {}", [i32ToString(event.params.label.at(2))])

  // NOTE(george): running into a type mismatch error on local graph node with the following
  // const callResult = singleEditionMintableContract.try_getURIsOfVersion(event.params.label)

  // HACK(george): my solution for now is to call getURIs as it will retrieve latest added
  // it is unlikley versions to be updated in quick succsession.
  const callResult = singleEditionMintableContract.try_getURIs()
  if(callResult.reverted){
    log.info("getURIs Reverted", [])
    // TODO: need to add urlHashes
    return
  }
  const URIs = callResult.value

  // create urlHash pair for image
  let imageUrlHash = findOrCreateUrlHashPair(`${id}-image`)
  imageUrlHash.id = `${id}-image`
  imageUrlHash.url = URIs.value0
  imageUrlHash.hash = URIs.value1.toHexString()
  imageUrlHash.type = "image"
  imageUrlHash.version = id
  imageUrlHash.lastUpdatedTimestamp = event.block.timestamp
  imageUrlHash.lastUpdatedBlockNumber = event.block.number

  imageUrlHash.save()

  // create urlHash pair for animation
  let animationUrlHash = findOrCreateUrlHashPair(`${id}-animation`)
  animationUrlHash.id = `${id}-animation`
  animationUrlHash.url = URIs.value0
  animationUrlHash.hash = URIs.value1.toHexString()
  animationUrlHash.type = "animation"
  animationUrlHash.version = id
  animationUrlHash.lastUpdatedTimestamp = event.block.timestamp
  animationUrlHash.lastUpdatedBlockNumber = event.block.number

  animationUrlHash.save()

  log.info(`Completed: handler for VersionAdded for token {}`, [id])
}

const urlTypes = [
  "image",
  "animation"
]

export function handleVersionURLUpdated(event: VersionURLUpdated): void{
  let context = dataSource.context()
  // find url hash pair
  let urlType = urlTypes[event.params.index]
  let id = `${context.getString('tokenContract')}-${formatLabel(event.params.label)}-${urlType}`
  let urlHashPair = findOrCreateUrlHashPair(id)

  // update url
  urlHashPair.url = event.params.url
  urlHashPair.lastUpdatedTimestamp = event.block.timestamp
  urlHashPair.lastUpdatedBlockNumber = event.block.number
  urlHashPair.save()
}

function i32ToString (value: i32): string {
  return BigInt.fromI32(value).toString()
}
// formats label to semantic versioning style
function formatLabel (label: i32[]): string {
  return `${i32ToString(label.at(0))}.${i32ToString(label.at(1))}.${i32ToString(label.at(2))}`
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

