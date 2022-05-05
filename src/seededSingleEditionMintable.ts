import { dataSource } from '@graphprotocol/graph-ts'

import {
  Transfer,
  VersionAdded,
  VersionURLUpdated,
  Approval,
  ApprovedMinter
} from '../types/templates/SeededSingleEditionMintable/SeededSingleEditionMintable'

import {
  approvedMinterHandler,
  transferHandler,
  approvalHandler,
  versionAddedHandler,
  versionURLUpdatedHandler
 } from './editionsHandlers'

let context = dataSource.context()

export function handleApprovedMinter(event: ApprovedMinter): void { approvedMinterHandler(event, context) }
export function handleTransfer(event: Transfer): void { transferHandler(event, context) }
export function handleApproval(event: Approval): void { approvalHandler(event, context) }
export function handleVersionAdded(event: VersionAdded): void { versionAddedHandler(event, context) }
export function handleVersionUrlUpdated(event: VersionURLUpdated): void { versionURLUpdatedHandler(event, context) }