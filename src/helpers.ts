import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts/index'
import { store, log } from '@graphprotocol/graph-ts'

import {
  User,
  EditionsAuction,
  Currency,
  Token,
  TokenContract
} from '../types/schema'

export const zeroAddress = '0x0000000000000000000000000000000000000000'
/**
 * Find or Create a User entity with `id` and return it
 * @param id
 */
 export function findOrCreateUser(id: string): User {
  let user = User.load(id)

  if (user == null) {
    user = new User(id)
    user.save()
  }

  return user as User
}

export function findOrCreateCurrency(id: string): Currency {
  let currency = Currency.load(id)

  if(currency == null){
    currency = new Currency(id)
    currency.save()
  }

  return currency as Currency
}


export function findOrCreateToken(id: string): Token {
  let token = Token.load(id)

  if(token == null){
    token = new Token(id)
    token.save()
  }

  return token as Token
}

export function findOrCreateTokenContract(id: string): TokenContract {
  let tokenContract = TokenContract.load(id)

  if(tokenContract == null){
    tokenContract = new TokenContract(id)
    tokenContract.save()
  }

  return tokenContract as TokenContract
}






export function createEditionsAuction(
  id: string,
  transactionHash: string,
  tokenContract: TokenContract,
  duration: BigInt,
  startTimestamp: BigInt,
  endTimestamp: BigInt,
  startPrice: BigInt,
  endPrice: BigInt,
  curatorRoyaltyBPS: BigInt,
  auctionCurrency: Currency,
  createdAtTimestamp: BigInt,
  createdAtBlockNumber: BigInt,
  creator: User,
  curator: User
): EditionsAuction {
  let editionsAuction = new EditionsAuction(id)

  editionsAuction.id = id
  editionsAuction.transactionHash = transactionHash
  editionsAuction.tokenContract = tokenContract.id
  editionsAuction.approved = false
  editionsAuction.duration = duration
  editionsAuction.startTimestamp = startTimestamp
  editionsAuction.endTimestamp = endTimestamp
  editionsAuction.startPrice = startPrice
  editionsAuction.endPrice = endPrice
  editionsAuction.approvedTimestamp = null
  editionsAuction.curatorRoyaltyBPS = curatorRoyaltyBPS
  editionsAuction.creator = creator.id
  editionsAuction.curator = curator.id
  editionsAuction.auctionCurrency = auctionCurrency.id
  editionsAuction.status = 'Pending'
  editionsAuction.createdAtTimestamp = createdAtTimestamp
  editionsAuction.createdAtBlockNumber = createdAtBlockNumber

  editionsAuction.save()

  return editionsAuction
}