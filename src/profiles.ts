import { Updated} from '../types/Profiles/Profiles'
import { findOrCreateUser } from "./helpers"
import { log } from '@graphprotocol/graph-ts'

export function handleProfileUpdated(event: Updated): void{
  let id = event.params.user.toHexString()

  log.info(`Starting handler for profiles Updated for user {}`, [id])

  let user = findOrCreateUser(id)

  let p = event.params.profile

  if(p.name.length !== 0)
    user.name = p.name

  if(p.description.length !== 0)
    user.description = p.description

  if(p.linkURI.length !== 0)
    user.link = p.linkURI

  user.profileUpdatedAtTimestamp = event.block.timestamp
  user.profileUpdatedAtBlockNumber = event.block.number

  user.save()

  log.info(`Completed handler for profiles Updated for user {}`, [id])
}