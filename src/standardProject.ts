import { dataSource } from '@graphprotocol/graph-ts'

import {
  Transfer,
  VersionAdded,
  VersionURLUpdated,
  Approval,
  ApprovedMinter,
  RoyaltyFundsRecipientChanged,
  PriceChanged,
  EditionSold,
} from '../types/templates/StandardProject/StandardProject'

import {
  approvedMinterHandler,
  transferHandler,
  approvalHandler,
  versionAddedHandler,
  versionURLUpdatedHandler,
  royaltyFundsRecipientChangedHandler,
  priceChangedHandler,
  editionSoldHandler
 } from './projectHandlers'

let context = dataSource.context()

export function handleApprovedMinter(event: ApprovedMinter): void { approvedMinterHandler(event, context) }
export function handleTransfer(event: Transfer): void { transferHandler(event, context) }
export function handleApproval(event: Approval): void { approvalHandler(event, context) }
export function handleVersionAdded(event: VersionAdded): void { versionAddedHandler(event, context) }
export function handleVersionURLUpdated(event: VersionURLUpdated): void { versionURLUpdatedHandler(event, context) }
export function handleRoyaltyFundsRecipientChanged(event: RoyaltyFundsRecipientChanged): void { royaltyFundsRecipientChangedHandler(event, context)}
export function handlePriceChanged(event: PriceChanged): void { priceChangedHandler(event, context)}
export function handleEditionSold(event: EditionSold): void { editionSoldHandler(event, context)}