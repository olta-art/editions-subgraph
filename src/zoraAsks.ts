import {AskCreated, AskPriceUpdated, AskCanceled, AskFilled} from "../types/AsksV1_1/AsksV1_1"
import { findOrCreateAsk, findOrCreateCurrency, findOrCreateEdition, findOrCreateUser } from "./helpers"
import { log, crypto, ByteArray, store } from '@graphprotocol/graph-ts'
import { Edition, Ask } from "../types/schema"

export function handleAskCreated (event: AskCreated):void {

  let id = `${event.params.tokenContract.toHexString()}-${event.params.tokenId.toString()}`
  // check nft is an olta edition
  let edition = Edition.load(id)
  if(edition === null) {
    return
  }

  log.info(`Starting handler for AskCreated {}`, [id])

  let ask = findOrCreateAsk(id)
  let currency = findOrCreateCurrency(event.params.ask.askCurrency.toHexString())

  ask.price = event.params.ask.askPrice
  ask.currency = currency.id
  ask.edition = edition.id
  ask.status = "Active"
  ask.createdAtTimestamp = event.block.timestamp
  ask.createdAtBlockNumber = event.block.number

  ask.save()

  log.info(`Completed handler for AskCreated {}`, [id])
}
export function handleAskPriceUpdated (event: AskPriceUpdated):void {
  let id = `${event.params.tokenContract.toHexString()}-${event.params.tokenId.toString()}`
  // check ask is for an olta edition
  let ask = Ask.load(id)
  if(ask === null){
    return
  }

  let currency = findOrCreateCurrency(event.params.ask.askCurrency.toHexString())

  ask.price = event.params.ask.askPrice
  ask.currency = currency.id

  ask.save()
}

export function handleAskCanceled (event: AskCanceled):void {
  let id = `${event.params.tokenContract.toHexString()}-${event.params.tokenId.toString()}`
  // check ask is for an olta edition
  let ask = Ask.load(id)
  if(ask === null){
    return
  }

  store.remove("Ask", id)
}

export function handleAskFilled (event: AskFilled):void {
  let id = `${event.params.tokenContract.toHexString()}-${event.params.tokenId.toString()}`
  // check ask is for an olta edition
  let ask = Ask.load(id)
  if(ask === null){
    return
  }

  const collector = findOrCreateUser(event.params.buyer.toHexString())

  ask.collector = collector.id
  ask.status = "Filled"
  ask.filledAtTimestamp = event.block.timestamp
  ask.filledAtBlockNumber = event.block.number

  // archive ask by appending the transaction hash to id
  ask.id = id + "-" + event.transaction.hash.toHexString()
  ask.save()

  // remove left over ask
  store.remove("Ask", id)
}