import {AskCreated, AskPriceUpdated, AskCanceled, AskFilled} from "../types/AsksV1_1/AsksV1_1"
import { findOrCreateAsk, findOrCreateCurrency, findOrCreateEdition } from "./helpers"
import { log } from '@graphprotocol/graph-ts'
import { Edition } from "../types/schema"

export function handleAskCreated (event: AskCreated):void {

  // check nft is an olta edition
  const edition = Edition.load(`${event.params.tokenContract.toHexString()}-${event.params.tokenId.toString()}`)
  if(edition === null) {
    return
  }

  let id = event.transaction.hash.toHexString()
  log.info(`Starting handler for AskCreated {}`, [id])

  const ask = findOrCreateAsk(id)
  const currency = findOrCreateCurrency(event.params.ask.askCurrency.toHexString())

  ask.price = event.params.ask.askPrice
  ask.currency = currency.id
  ask.edition = edition.id
  ask.status = "Active"
  ask.createdAtTimestamp = event.block.timestamp
  ask.createdAtBlockNumber = event.block.number

  ask.save()

  log.info(`Completed handler for AskCreated {}`, [id])
}
export function handleAskPriceUpdated (event: AskPriceUpdated):void {}
export function handleAskCanceled (event: AskCanceled):void {}
export function handleAskFilled (event: AskFilled):void {}