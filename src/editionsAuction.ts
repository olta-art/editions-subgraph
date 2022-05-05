import {
  AuctionCreated,
  AuctionApprovalUpdated,
  EditionPurchased,
  SeededEditionPurchased
} from '../types/EditionsAuction/EditionsAuction'

import {
  EditionsAuction, Purchase
} from '../types/schema'

import {
  createEditionsAuction,
  findOrCreateCurrency,
  findOrCreateToken,
  findOrCreateTokenContract,
  findOrCreateUser
} from './helpers'

import { log } from '@graphprotocol/graph-ts'


export function handleEditionsAuctionCreated(event: AuctionCreated): void {
  log.info(`Starting handler for AuctionCreated for auction {}`, [
    event.params.auctionId.toString()
  ])

  const tokenCreator = findOrCreateUser(event.params.creator.toHexString())
  const curator = findOrCreateUser(event.params.curator.toHexString())
  const tokenContract = findOrCreateTokenContract(event.params.edition.id.toHexString())
  const currency = findOrCreateCurrency(event.params.auctionCurrency.toHexString())
  const endTimestamp = event.params.startTimestamp.plus(event.params.duration)

  createEditionsAuction(
    event.params.auctionId.toString(),
    event.transaction.hash.toHexString(),
    tokenContract,
    event.params.duration,
    event.params.startTimestamp,
    endTimestamp,
    event.params.startPrice,
    event.params.endPrice,
    event.params.numberOfPriceDrops,
    event.params.curatorRoyaltyBPS,
    currency,
    event.block.timestamp,
    event.block.number,
    tokenCreator,
    curator
  )

  log.info(`Completed handler for AuctionCreated for auction {}`, [
    event.params.auctionId.toString(),
  ])
}

export function handleAuctionApprovalUpdated(event: AuctionApprovalUpdated): void {
  let id = event.params.auctionId.toString()
  log.info(`Starting handler for AuctionApprovalUpdate on auction {}`, [id])

  let auction = EditionsAuction.load(id)

  if(auction == null) {
    log.error('Missing Editions Auction with id {} for approval', [id])
    return
  }

  auction.approved = event.params.approved
  auction.status = event.params.approved ? "Active" : "Canceled"
  auction.approvedTimestamp = event.block.timestamp
  auction.approvedBlockNumber = event.block.number
  auction.save()

  log.info(`Completed handler for AuctionApprovalUpdate on auction {}`, [id])
}

export function handleEditionPurchased(event: EditionPurchased): void {
  const id = event.transaction.hash.toHexString()
  log.info(`Starting handler for EditionPurchased on auction {}`, [id])

  createPurchase(event, id)

  log.info(`Completed handler for EditionPurchased on auction {}`, [id])
}

export function handleSeededEditionPurchased(event: SeededEditionPurchased): void {
  const id = event.transaction.hash.toHexString()
  log.info(`Starting handler for SeededEditionPurchased on auction {}`, [id])

  createPurchase(event, id)

  log.info(`Completed handler for SeededEditionPurchased on auction {}`, [id])
}

function createPurchase<T extends EditionPurchased>(event: T, id: string): void {
  const auctionId = event.params.auctionId.toString()

  let auction = EditionsAuction.load(auctionId)

  if(auction == null) {
    log.error('Missing Editions Auction with id {} for purchase', [auctionId])
    return
  }

  let purchase = new Purchase(id)

  purchase.id = id
  purchase.transactionHash = id
  purchase.editionsAuction = auctionId
  purchase.amount = event.params.price
  purchase.collector = event.params.owner.toHexString()
  purchase.purchaseType = "Final"
  purchase.createdAtTimestamp = event.block.timestamp
  purchase.createdAtBlockNumber = event.block.number
  purchase.currency = auction.auctionCurrency

  let tokenId = `${event.params.tokenContract.toHexString()}-${event.params.tokenId.toString()}`
  let token = findOrCreateToken(tokenId)
  purchase.token = token.id

  purchase.save()
}