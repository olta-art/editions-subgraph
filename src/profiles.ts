import { Updated} from '../types/Profiles/Profiles'
import { findOrCreateProfile } from "./helpers"
import { log } from '@graphprotocol/graph-ts'

export function handleProfileUpdated(event: Updated): void{
  let id = event.params.user.toHexString()

  log.info(`Starting handler for profiles Updated for user {}`, [id])

  let profile = findOrCreateProfile(id)

  let p = event.params.profile

  if(p.name.length !== 0)
    profile.name = p.name

  if(p.description.length !== 0)
    profile.description = p.description

  if(p.linkURI.length !== 0)
    profile.link = p.linkURI

    profile.updatedAtTimestamp = event.block.timestamp
    profile.updatedAtBlockNumber = event.block.number

  profile.save()

  log.info(`Completed handler for profiles Updated for user {}`, [id])
}