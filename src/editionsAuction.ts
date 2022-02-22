import {
  AuctionCreated
} from '../types/EditionsAuction/EditionsAuction'

import {
  createEditionsAuction,
  findOrCreateCurrency,
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
  const tokenContract = findOrCreateTokenContract(event.params.editionContract.toHexString())
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
