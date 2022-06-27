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
  findOrCreateProject,
  findOrCreateUrlHashPair,
  findOrCreateUrlUpdate,
  findOrCreateUser,
  findOrCreateTransfer,
  findOrCreateProjectMinterApproval,
  zeroAddress,
  formatLabel,
  addVersion,
} from './helpers'

import {
  urlTypes,
} from './constants'

import { log, Address, BigInt, DataSourceContext } from '@graphprotocol/graph-ts'

export function approvedMinterHandler<T extends ApprovedMinter>(event: T, context: DataSourceContext): void{
  let projectAddress = context.getString('project')
  let minterAddress = event.params.minter.toHexString()
  let status = event.params.approved

  let minterApprovalId = `${minterAddress}-${projectAddress}`
  let minterApproval = findOrCreateProjectMinterApproval(minterApprovalId)

  let minter = findOrCreateUser(minterAddress)

  minterApproval.project = projectAddress
  minterApproval.user = minter.id
  minterApproval.status = status

  minterApproval.save()
}

export function transferHandler<T extends Transfer>(event: T, context: DataSourceContext): void {
  const tokenId = `${context.getString('project')}-${event.params.tokenId.toString()}`
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
  const id = `${context.getString('project')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Mint for token {}`, [id])
  let token = findOrCreateToken(id)
  let project = findOrCreateProject(context.getString('project'))

  token.id = id
  token.editionNumber = event.params.tokenId
  token.project = context.getString('project')
  token.owner = findOrCreateUser(event.params.to.toHexString()).id
  token.prevOwner = zeroAddress
  token.createdAtTransactionHash = event.transaction.hash.toHexString()
  token.createdAtTimestamp = event.block.timestamp
  token.createdAtBlockNumber = event.block.number

  // call tokenURI from project
  let projectAddress = Address.fromString(context.getString('project'))

  if(project.implementation == "editions"){
    let singleEditionMintable = SingleEditionMintableContract.bind(projectAddress)
    token.tokenURI = singleEditionMintable.tokenURI(event.params.tokenId)
  }

  if(project.implementation == "seededEditions"){
    let seededSingleEditionMintable = SeededSingleEditionMintable.bind(projectAddress)
    token.tokenURI = seededSingleEditionMintable.tokenURI(event.params.tokenId)
    token.seed = seededSingleEditionMintable.seedOfTokens(event.params.tokenId)
  }

  token.save()

  // update token contract totalMint and totalSupply count
  project.totalMinted = project.totalMinted.plus(BigInt.fromI32(1))
  project.totalSupply = project.totalSupply.plus(BigInt.fromI32(1))
  project.save()

  // TODO: test/research to see if this ever gets missed as purchese needs to be indexed before
  // index token to purchase based on tx hash
  addTokenToPurchase(
    id,
    event.transaction.hash.toHexString()
  )

  log.info(`Completed handler for Mint for token {}`, [id])
}

function burnHandler<T extends Transfer>(event: T, context: DataSourceContext): void {
  const id = `${context.getString('project')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Burn for token {}`, [id])
  let token = findOrCreateToken(id)

  token.burnedAtTimeStamp = event.block.timestamp
  token.burnedAtBlockNumber = event.block.number
  token.owner = zeroAddress
  token.prevOwner = event.params.from.toHexString()

  token.save()

  // update token contract totalBurned and totalSupply count
  let project = findOrCreateProject(context.getString('project'))
  project.totalBurned = project.totalBurned.plus(BigInt.fromI32(1))
  project.totalSupply = project.totalSupply.minus(BigInt.fromI32(1))
  project.save()

  log.info(`Completed handler for Burn for token {}`, [id])
}

export function approvalHandler<T extends Approval>(event: T, context: DataSourceContext): void {
  let ownerAddr = event.params.owner.toHexString()
  let approvedAddr = event.params.approved.toHexString()
  let tokenId = event.params.tokenId.toString()

  const id = `${context.getString('project')}-${tokenId}`

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
  let projectAddress = context.getString('project')

  let id = `${context.getString('project')}-${formatLabel(event.params.label)}`
  log.info(`Starting handler for VersionAdded for token {}`, [id])

  // update token contract
  let project = findOrCreateProject(projectAddress)

  if(project.implementation == "editions") {
     // call getURIs of version to fetch uris for specifc for label
    const singleEditionMintableContract = SingleEditionMintableContract.bind(
      Address.fromString(projectAddress)
    )

    // HACK(george): running into a type mismatch error with the following
    // const callResult = singleEditionMintableContract.try_getURIsOfVersion(event.params.label)
    // TODO: try this https://www.assemblyscript.org/stdlib/staticarray.html
    // my solution for now is to call getURIs as it will retrieve latest added URIs
    // it is "unlikley" versions to be updated in quick succsession.
    const callResult = singleEditionMintableContract.try_getURIs()
    if(callResult.reverted){
      log.info("getURIs Reverted", [])
      // TODO: need to add urlHashes
      return
    }

    // handle token contract initialization
    if(!project.lastAddedVersion){
      project.name = singleEditionMintableContract.name()
      project.symbol = singleEditionMintableContract.symbol()
      project.description = singleEditionMintableContract.description()
      project.creatorRoyaltyBPS = singleEditionMintableContract.royaltyBPS()
    }

    // update latest versions
    project.lastAddedVersion = id

    project.save()

    addVersion(
      id,
      formatLabel(event.params.label),
      project.id,
      callResult.value.value0,
      callResult.value.value1.toHexString(),
      callResult.value.value2,
      callResult.value.value3.toHexString(),
      callResult.value.value4,
      callResult.value.value5.toHexString(),
      event.block.timestamp,
      event.block.number
    )
  }

  if(project.implementation == "seededEditions"){
    // call getURIs of version to fetch uris for specifc for label
    const seededSingleEditionMintable = SeededSingleEditionMintable.bind(
      Address.fromString(projectAddress)
    )

    // HACK(george): same hack as used above for singlineEditionMintable
    const callResult = seededSingleEditionMintable.try_getURIs()
    if(callResult.reverted){
      log.info("getURIs Reverted", [])
      // TODO: need to add urlHashes
      return
    }

    // handle token contract initialization
    if(!project.lastAddedVersion){
      project.name = seededSingleEditionMintable.name()
      project.symbol = seededSingleEditionMintable.symbol()
      project.description = seededSingleEditionMintable.description()
      project.creatorRoyaltyBPS = seededSingleEditionMintable.royaltyBPS()
    }

    // update latest versions
    project.lastAddedVersion = id

    project.save()

    addVersion(
      id,
      formatLabel(event.params.label),
      project.id,
      callResult.value.value0,
      callResult.value.value1.toHexString(),
      callResult.value.value2,
      callResult.value.value3.toHexString(),
      callResult.value.value4,
      callResult.value.value5.toHexString(),
      event.block.timestamp,
      event.block.number
    )
  }

  log.info(`Completed: handler for VersionAdded for token {}`, [id])
}

export function versionURLUpdatedHandler<T extends VersionURLUpdated>(event: T, context: DataSourceContext): void{
  // get urlHashPair
  let urlType = urlTypes[event.params.index]
  let id = `${context.getString('project')}-${formatLabel(event.params.label)}-${urlType}`
  let urlHashPair = findOrCreateUrlHashPair(id)

  // create urlUpdate
  let urlUpdateId = `${event.transaction.hash.toHexString()}-${event.logIndex}`
  let urlUpdate = findOrCreateUrlUpdate(urlUpdateId)

  urlUpdate.id = urlUpdateId
  urlUpdate.transactionHash = event.transaction.hash.toHexString()
  urlUpdate.from = urlHashPair.url
  urlUpdate.to = event.params.url
  urlUpdate.project = context.getString('project')
  urlUpdate.version = `${context.getString('project')}-${formatLabel(event.params.label)}`
  urlUpdate.urlHashPair = urlHashPair.id
  urlUpdate.createdAtTimestamp = event.block.timestamp
  urlUpdate.createdAtBlockNumber = event.block.number

  urlUpdate.save()

  // update url on urlHashPair
  urlHashPair.url = event.params.url
  urlHashPair.save()
}
