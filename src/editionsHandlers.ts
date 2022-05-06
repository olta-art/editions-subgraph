// Edition handlers
import {
  Transfer,
  SingleEditionMintable as SingleEditionMintableContract,
  VersionAdded,
  VersionURLUpdated,
  Approval,
  ApprovedMinter,
} from '../types/templates/SingleEditionMintable/SingleEditionMintable'

import {
  SeededSingleEditionMintable,
} from '../types/templates/SeededSingleEditionMintable/SeededSingleEditionMintable'

import {
  Purchase,
} from '../types/schema'

import {
  findOrCreateToken,
  findOrCreateTokenContract,
  findOrCreateUrlHashPair,
  findOrCreateUrlUpdate,
  findOrCreateUser,
  findOrCreateTransfer,
  findOrCreateTokenContractMinterApproval,
  zeroAddress,
  formatLabel,
  addVersion,
} from './helpers'

import {
  urlTypes,
} from './constants'

import { log, Address, BigInt, DataSourceContext } from '@graphprotocol/graph-ts'

export function approvedMinterHandler<T extends ApprovedMinter>(event: T, context: DataSourceContext): void{
  let tokenContractAddress = context.getString('tokenContract')
  let minterAddress = event.params.minter.toHexString()
  let status = event.params.approved

  let minterApprovalId = `${minterAddress}-${tokenContractAddress}`
  let minterApproval = findOrCreateTokenContractMinterApproval(minterApprovalId)

  let minter = findOrCreateUser(minterAddress)

  minterApproval.tokenContract = tokenContractAddress
  minterApproval.user = minter.id
  minterApproval.status = status

  minterApproval.save()
}

export function transferHandler<T extends Transfer>(event: T, context: DataSourceContext): void {
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
    mintHandler(event, context)
    log.info(`Completed handler for Transfer for token {}`, [tokenId])
    return
  }

  // handle burn
  let to = event.params.to.toHexString()
  if(!to || (to == zeroAddress)){
    burnHandler(event, context)
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

function mintHandler<T extends Transfer>(event: T, context: DataSourceContext): void {
  const id = `${context.getString('tokenContract')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Mint for token {}`, [id])
  let token = findOrCreateToken(id)
  let tokenContract = findOrCreateTokenContract(context.getString('tokenContract'))

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

  if(tokenContract.implementation == "editions"){
    let singleEditionMintable = SingleEditionMintableContract.bind(tokenContractAddress)
    token.tokenURI = singleEditionMintable.tokenURI(event.params.tokenId)
  }

  if(tokenContract.implementation == "seededEditions"){
    let seededSingleEditionMintable = SeededSingleEditionMintable.bind(tokenContractAddress)
    token.tokenURI = seededSingleEditionMintable.tokenURI(event.params.tokenId)
    token.seed = seededSingleEditionMintable.seedOfTokens(event.params.tokenId)
  }

  token.save()

  // update token contract totalMint and totalSupply count
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

function burnHandler<T extends Transfer>(event: T, context: DataSourceContext): void {
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

export function approvalHandler<T extends Approval>(event: T, context: DataSourceContext): void {
  let ownerAddr = event.params.owner.toHexString()
  let approvedAddr = event.params.approved.toHexString()
  let tokenId = event.params.tokenId.toString()

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

function addTokenToPurchase(tokenId: string,txHash: string): void {
  let purchase = Purchase.load(txHash)
  if(purchase != null){
    log.info(`Starting: add token to purchase`, [txHash])
    purchase.token = tokenId
    purchase.save()
    log.info(`Completed: add token to purchase`, [txHash])
  }
}

export function versionAddedHandler<T extends VersionAdded>(event: T, context: DataSourceContext): void {
  let tokenContractAddress = context.getString('tokenContract')

  let id = `${context.getString('tokenContract')}-${formatLabel(event.params.label)}`
  log.info(`Starting handler for VersionAdded for token {}`, [id])

  // update token contract
  let tokenContract = findOrCreateTokenContract(tokenContractAddress)

  if(tokenContract.implementation == "editions") {
     // call getURIs of version to fetch uris for specifc for label
    const singleEditionMintableContract = SingleEditionMintableContract.bind(
      Address.fromString(tokenContractAddress)
    )

    // HACK(george): running into a type mismatch error with the following
    const callResult = singleEditionMintableContract.try_getURIsOfVersion(event.params.label)
    // TODO: try this https://www.assemblyscript.org/stdlib/staticarray.html
    // my solution for now is to call getURIs as it will retrieve latest added URIs
    // it is "unlikley" versions to be updated in quick succsession.
    // const callResult = singleEditionMintableContract.try_getURIs()
    if(callResult.reverted){
      log.info("getURIs Reverted", [])
      // TODO: need to add urlHashes
      return
    }

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

    addVersion(
      id,
      formatLabel(event.params.label),
      tokenContract.id,
      callResult.value.value0,
      callResult.value.value1.toHexString(),
      callResult.value.value2,
      callResult.value.value3.toHexString(),
      event.block.timestamp,
      event.block.number
    )
  }

  if(tokenContract.implementation == "seededEditions"){
    // call getURIs of version to fetch uris for specifc for label
    const seededSingleEditionMintable = SeededSingleEditionMintable.bind(
      Address.fromString(tokenContractAddress)
    )

    // HACK(george): same hack as used above for singlineEditionMintable
    const callResult = seededSingleEditionMintable.try_getURIs()
    if(callResult.reverted){
      log.info("getURIs Reverted", [])
      // TODO: need to add urlHashes
      return
    }

    // handle token contract initialization
    if(!tokenContract.lastAddedVersion){
      tokenContract.name = seededSingleEditionMintable.name()
      tokenContract.symbol = seededSingleEditionMintable.symbol()
      tokenContract.description = seededSingleEditionMintable.description()
      tokenContract.creatorRoyaltyBPS = seededSingleEditionMintable.royaltyBPS()
    }

    // update latest versions
    tokenContract.lastAddedVersion = id

    tokenContract.save()

    addVersion(
      id,
      formatLabel(event.params.label),
      tokenContract.id,
      callResult.value.value0,
      callResult.value.value1.toHexString(),
      callResult.value.value2,
      callResult.value.value3.toHexString(),
      event.block.timestamp,
      event.block.number
    )
  }

  log.info(`Completed: handler for VersionAdded for token {}`, [id])
}

export function versionURLUpdatedHandler<T extends VersionURLUpdated>(event: T, context: DataSourceContext): void{
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
