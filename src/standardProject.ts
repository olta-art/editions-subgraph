import { dataSource } from '@graphprotocol/graph-ts'

import {
  Transfer,
  VersionAdded,
  VersionURLUpdated,
  Approval,
  ApprovedMinter,
  RoyaltyFundsRecipientChanged,
  OwnershipTransferred
} from '../types/templates/StandardProject/StandardProject'

import {
  approvedMinterHandler,
  transferHandler,
  approvalHandler,
  versionAddedHandler,
  versionURLUpdatedHandler,
  royaltyFundsRecipientChangedHandler,
  ownershipTransferredHandler
 } from './projectHandlers'

let context = dataSource.context()

export function handleApprovedMinter(event: ApprovedMinter): void { approvedMinterHandler(event, context) }
export function handleTransfer(event: Transfer): void { transferHandler(event, context) }
export function handleApproval(event: Approval): void { approvalHandler(event, context) }
export function handleVersionAdded(event: VersionAdded): void { versionAddedHandler(event, context) }
export function handleVersionURLUpdated(event: VersionURLUpdated): void { versionURLUpdatedHandler(event, context) }
export function handleRoyaltyFundsRecipientChanged(event: RoyaltyFundsRecipientChanged): void { royaltyFundsRecipientChangedHandler(event, context)}
export function handleOwnershipTransferred(event: OwnershipTransferred): void {ownershipTransferredHandler(event, context)}