// Edition handlers
import {
  Transfer,
  SingleEditionMintable as SingleEditionMintableContract,
  VersionAdded,
  VersionURLUpdated,
  Approval,
  ApprovedMinter,
  RoyaltyFundsRecipientChanged,
} from '../types/templates/SingleEditionMintable/SingleEditionMintable'

import {
  SeededSingleEditionMintable,
} from '../types/templates/SeededSingleEditionMintable/SeededSingleEditionMintable'

import {
  Purchase,
} from '../types/schema'

import {
  findOrCreateEdition,
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
  const editionId = `${context.getString('project')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Transfer for edition {}`, [editionId])

  // create transfer
  let transferId = `${editionId}-${event.transaction.hash.toHexString()}`
  let transfer = findOrCreateTransfer(transferId)
  transfer.id = transferId
  transfer.transactionHash = event.transaction.hash.toHexString()
  transfer.edition = editionId
  transfer.from = event.params.from.toHexString()
  transfer.to = event.params.to.toHexString()
  transfer.createdAtTimestamp = event.block.timestamp
  transfer.createdAtBlockNumber = event.block.number
  transfer.save()

  // handle mint
  let from = event.params.from.toHexString()
  if(!from || (from == zeroAddress)){
    mintHandler(event, context)
    log.info(`Completed handler for Transfer for edition {}`, [editionId])
    return
  }

  // handle burn
  let to = event.params.to.toHexString()
  if(!to || (to == zeroAddress)){
    burnHandler(event, context)
    log.info(`Completed handler for Transfer for edition {}`, [editionId])
    return
  }

  // update edition
  let edition = findOrCreateEdition(editionId)
  edition.owner = to
  edition.prevOwner = from
  edition.save()

  log.info(`Completed handler for Transfer for edition {}`, [editionId])
}

function mintHandler<T extends Transfer>(event: T, context: DataSourceContext): void {
  const id = `${context.getString('project')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Mint for edition {}`, [id])
  let edition = findOrCreateEdition(id)
  let project = findOrCreateProject(context.getString('project'))

  edition.id = id
  edition.number = event.params.tokenId
  edition.project = context.getString('project')
  edition.owner = findOrCreateUser(event.params.to.toHexString()).id
  edition.prevOwner = zeroAddress
  edition.createdAtTransactionHash = event.transaction.hash.toHexString()
  edition.createdAtTimestamp = event.block.timestamp
  edition.createdAtBlockNumber = event.block.number

  // call tokenURI from project
  let projectAddress = Address.fromString(context.getString('project'))

  if(project.implementation == "Standard"){
    let singleEditionMintable = SingleEditionMintableContract.bind(projectAddress)
    edition.uri = singleEditionMintable.tokenURI(event.params.tokenId)
  }

  if(project.implementation == "Seeded"){
    let seededSingleEditionMintable = SeededSingleEditionMintable.bind(projectAddress)
    edition.uri = seededSingleEditionMintable.tokenURI(event.params.tokenId)
    edition.seed = seededSingleEditionMintable.seedOfTokens(event.params.tokenId)
  }

  edition.save()

  // update project totals
  project.totalMinted = project.totalMinted.plus(BigInt.fromI32(1))
  project.totalSupply = project.totalSupply.plus(BigInt.fromI32(1))
  project.save()

  // TODO: test/research to see if this ever gets missed as purchese needs to be indexed before
  // index edition to purchase based on tx hash
  addEditionToPurchase(
    id,
    event.transaction.hash.toHexString()
  )

  log.info(`Completed handler for Mint for edition {}`, [id])
}

function burnHandler<T extends Transfer>(event: T, context: DataSourceContext): void {
  const id = `${context.getString('project')}-${event.params.tokenId.toString()}`
  log.info(`Starting handler for Burn for edtion {}`, [id])
  let edition = findOrCreateEdition(id)

  edition.burnedAtTimeStamp = event.block.timestamp
  edition.burnedAtBlockNumber = event.block.number
  edition.owner = zeroAddress
  edition.prevOwner = event.params.from.toHexString()

  edition.save()

  // update project totals
  let project = findOrCreateProject(context.getString('project'))
  project.totalBurned = project.totalBurned.plus(BigInt.fromI32(1))
  project.totalSupply = project.totalSupply.minus(BigInt.fromI32(1))
  project.save()

  log.info(`Completed handler for Burn for edition {}`, [id])
}

export function approvalHandler<T extends Approval>(event: T, context: DataSourceContext): void {
  let ownerAddr = event.params.owner.toHexString()
  let approvedAddr = event.params.approved.toHexString()
  let editionId = event.params.tokenId.toString()

  const id = `${context.getString('project')}-${editionId}`

  log.info(
    `Starting handler for Approval Event of editionId: {}, owner: {}, approved: {}`,
    [editionId, ownerAddr, approvedAddr]
  )

  let edition = findOrCreateEdition(id)

  if(!approvedAddr || (approvedAddr == zeroAddress)){
    edition.approved = null
  } else {
    edition.approved = findOrCreateUser(approvedAddr).id
  }

  edition.save()

  log.info(
    `Completed handler for Approval Event of editionId: {}, owner: {}, approved: {}`,
    [editionId, ownerAddr, approvedAddr]
  )
}

function addEditionToPurchase(editionId: string,txHash: string): void {
  let purchase = Purchase.load(txHash)
  if(purchase != null){
    log.info(`Starting: add edition to purchase`, [txHash])
    purchase.edition = editionId
    purchase.save()
    log.info(`Completed: add edition to purchase`, [txHash])
  }
}

export function versionAddedHandler<T extends VersionAdded>(event: T, context: DataSourceContext): void {
  let projectAddress = context.getString('project')

  let id = `${context.getString('project')}-${formatLabel(event.params.label)}`
  log.info(`Starting handler for VersionAdded for project {}`, [id])

  let project = findOrCreateProject(projectAddress)

  if(project.implementation == "Standard") {
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

    // handle project initialization
    if(!project.lastAddedVersion){
      project.name = singleEditionMintableContract.name()
      project.symbol = singleEditionMintableContract.symbol()
      project.description = singleEditionMintableContract.description()
      project.royaltyBPS = singleEditionMintableContract.royaltyBPS()
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

  if(project.implementation == "Seeded"){
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

    // handle project initialization
    if(!project.lastAddedVersion){
      project.name = seededSingleEditionMintable.name()
      project.symbol = seededSingleEditionMintable.symbol()
      project.description = seededSingleEditionMintable.description()
      project.royaltyBPS = seededSingleEditionMintable.royaltyBPS()
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

  log.info(`Completed: handler for VersionAdded for project {}`, [id])
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

export function royaltyFundsRecipientChangedHandler<T extends RoyaltyFundsRecipientChanged>(event: T, context: DataSourceContext): void {
  const projectId = context.getString('project')

  log.info(`Starting: handler for royaltyFundsRecipientChanged for project {}`, [projectId])
  let project = findOrCreateProject(projectId)
  project.royaltyRecpient = event.params.newRecipientAddress.toHexString()
  project.save()
  log.info(`Completed: handler for royaltyFundsRecipientChanged for project {}`, [projectId])
}