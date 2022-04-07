import {
  Transfer,
  SingleEditionMintable as SingleEditionMintableContract,
  VersionAdded,
  VersionURLUpdated,
  SingleEditionMintable__getURIsResult,
  Approval
} from '../types/templates/SingleEditionMintable/SingleEditionMintable'

import {
  Purchase, UrlHashPair, UrlUpdate
} from '../types/schema'

import {
  findOrCreateToken,
  findOrCreateUrlHashPair,
  findOrCreateUrlUpdate,
  findOrCreateUser,
  findOrCreateVersion,
  findOrCreateTransfer,
  zeroAddress,
  findOrCreateTokenContract
} from './helpers'

import { log, dataSource, Address, BigInt } from '@graphprotocol/graph-ts'

export function handleTransfer(event: Transfer): void {
  let context = dataSource.context()
  const tokenId = `${context.getString('tokenContract')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Transfer for token {}`, [tokenId])

  // create transfer
  let transferId = `${tokenId}-${event.transaction.hash.toHexString()}`
  let transfer = findOrCreateTransfer(transferId)
  transfer.id = transferId
  transfer.transactionHash = event.transaction.hash.toHexString()
  transfer.token = tokenId
  transfer.from = event.params.from.toHexString()
  transfer.to = event.params.to.toHexString()
  transfer.createdAtTimestamp = event.block.timestamp
  transfer.createdAtBlockNumber = event.block.number
  transfer.save()

  // handle mint
  let from = event.params.from.toHexString()
  if(!from || (from == zeroAddress)){
    handleMint(event)
    log.info(`Completed handler for Transfer for token {}`, [tokenId])
    return
  }

  // handle burn
  let to = event.params.to.toHexString()
  if(!to || (to == zeroAddress)){
    handleBurn(event)
    log.info(`Completed handler for Transfer for token {}`, [tokenId])
    return
  }

  // update token
  let token = findOrCreateToken(tokenId)
  token.owner = to
  token.prevOwner = from
  token.save()

  log.info(`Completed handler for Transfer for token {}`, [tokenId])
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

  // update token contract totalMint and totalSupply count
  let tokenContract = findOrCreateTokenContract(context.getString('tokenContract'))
  tokenContract.totalMinted = tokenContract.totalMinted.plus(BigInt.fromI32(1))
  tokenContract.totalSupply = tokenContract.totalSupply.plus(BigInt.fromI32(1))
  tokenContract.save()

  // TODO: test/research to see if this ever gets missed as purchese needs to be indexed before
  // index token to purchase based on tx hash
  addTokenToPurchase(
    id,
    event.transaction.hash.toHexString()
  )

  log.info(`Completed handler for Mint for token {}`, [id])
}

function handleBurn(event: Transfer): void {
  let context = dataSource.context()
  const id = `${context.getString('tokenContract')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Burn for token {}`, [id])
  let token = findOrCreateToken(id)

  token.burnedAtTimeStamp = event.block.timestamp
  token.burnedAtBlockNumber = event.block.number
  token.owner = zeroAddress
  token.prevOwner = event.params.from.toHexString()

  token.save()

  // update token contract totalBurned and totalSupply count
  let tokenContract = findOrCreateTokenContract(context.getString('tokenContract'))
  tokenContract.totalBurned = tokenContract.totalBurned.plus(BigInt.fromI32(1))
  tokenContract.totalSupply = tokenContract.totalSupply.minus(BigInt.fromI32(1))
  tokenContract.save()

  log.info(`Completed handler for Burn for token {}`, [id])
}

export function handleApproval(event: Approval): void {
  let ownerAddr = event.params.owner.toHexString()
  let approvedAddr = event.params.approved.toHexString()
  let tokenId = event.params.tokenId.toString()

  let context = dataSource.context()
  const id = `${context.getString('tokenContract')}-${tokenId}`

  log.info(
    `Starting handler for Approval Event of tokenId: {}, owner: {}, approved: {}`,
    [tokenId, ownerAddr, approvedAddr]
  )

  let token = findOrCreateToken(id)

  if(!approvedAddr || (approvedAddr == zeroAddress)){
    token.approved = null
  } else {
    token.approved = findOrCreateUser(approvedAddr).id
  }

  token.save()

  log.info(
    `Completed handler for Approval Event of tokenId: {}, owner: {}, approved: {}`,
    [tokenId, ownerAddr, approvedAddr]
  )
}

export function handleVersionAdded(event: VersionAdded): void {
  let context = dataSource.context()
  let tokenContractAddress = context.getString('tokenContract')

  let id = `${context.getString('tokenContract')}-${formatLabel(event.params.label)}`
  log.info(`Starting handler for VersionAdded for token {}`, [id])

  let version = findOrCreateVersion(id)

  version.id = id
  version.label = formatLabel(event.params.label)
  version.tokenContract = tokenContractAddress
  version.createdAtBlockNumber = event.block.number
  version.createdAtTimestamp = event.block.timestamp

  // call getURIs of version to fetch uris for specifc for label
  const singleEditionMintableContract = SingleEditionMintableContract.bind(
    Address.fromString(context.getString('tokenContract'))
  )

  // NOTE(george): running into a type mismatch error on local graph node with the following
  //const callResult = singleEditionMintableContract.try_getURIsOfVersion(event.params.label)

  // HACK(george): my solution for now is to call getURIs as it will retrieve latest added
  // it is unlikley versions to be updated in quick succsession.
  const callResult = singleEditionMintableContract.try_getURIs()
  if(callResult.reverted){
    log.info("getURIs Reverted", [])
    // TODO: need to add urlHashes
    return
  }

  // create urlHash pair for image
  const image = addUrlHashPair(
    id,
    "image",
    callResult.value,
    event
  )
  version.image = image.id

  // create urlHash pair for animation
  const animation = addUrlHashPair(
    id,
    "animation",
    callResult.value,
    event
  )
  version.animation = animation.id

  version.save()

  // update token contract
  let tokenContract = findOrCreateTokenContract(tokenContractAddress)

  // handle token contract initialization
  if(!tokenContract.lastAddedVersion){
    tokenContract.name = singleEditionMintableContract.name()
    tokenContract.symbol = singleEditionMintableContract.symbol()
    tokenContract.description = singleEditionMintableContract.description()
    tokenContract.creatorRoyaltyBPS = singleEditionMintableContract.royaltyBPS()
  }

  // update latest versions
  tokenContract.lastAddedVersion = id

  tokenContract.save()

  log.info(`Completed: handler for VersionAdded for token {}`, [id])
}

function addUrlHashPair(
  versionId: string,
  type: string, // TODO: enum check?
  getURIsResult: SingleEditionMintable__getURIsResult,
  event: VersionAdded
): UrlHashPair {
  let urlHashPair = findOrCreateUrlHashPair(`${versionId}-${type}`)
  urlHashPair.id = `${versionId}-${type}`
  urlHashPair.version = versionId
  urlHashPair.type = type
  urlHashPair.createdAtTimestamp = event.block.timestamp
  urlHashPair.createdAtBlockNumber = event.block.number

  if(type === "image"){
    urlHashPair.url = getURIsResult.value0
    urlHashPair.hash = getURIsResult.value1.toHexString()
  }

  if(type === "animation"){
    urlHashPair.url = getURIsResult.value2
    urlHashPair.hash = getURIsResult.value3.toHexString()
  }

  urlHashPair.save()

  return urlHashPair
}

const urlTypes = [
  "image",
  "animation"
]

export function handleVersionURLUpdated(event: VersionURLUpdated): void{
  let context = dataSource.context()

  // get urlHashPair
  let urlType = urlTypes[event.params.index]
  let id = `${context.getString('tokenContract')}-${formatLabel(event.params.label)}-${urlType}`
  let urlHashPair = findOrCreateUrlHashPair(id)

  // create urlUpdate
  let urlUpdateId = `${event.transaction.hash.toHexString()}-${event.logIndex}`
  let urlUpdate = findOrCreateUrlUpdate(urlUpdateId)

  urlUpdate.id = urlUpdateId
  urlUpdate.transactionHash = event.transaction.hash.toHexString()
  urlUpdate.from = urlHashPair.url
  urlUpdate.to = event.params.url
  urlUpdate.tokenContract = context.getString('tokenContract')
  urlUpdate.version = `${context.getString('tokenContract')}-${formatLabel(event.params.label)}`
  urlUpdate.urlHashPair = urlHashPair.id
  urlUpdate.createdAtTimestamp = event.block.timestamp
  urlUpdate.createdAtBlockNumber = event.block.number

  urlUpdate.save()

  // update url on urlHashPair
  urlHashPair.url = event.params.url
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

