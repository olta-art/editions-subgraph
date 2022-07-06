import {
  StandardProject,
  SeededProject
} from '../../types/templates'
import {
  CreatedProject,
  CreatorApprovalsUpdated
} from '../../types/ProjectCreator/ProjectCreator'
import {
  findOrCreateProjectCreator,
  findOrCreateProject,
  findOrCreateUser,
  zeroAddress
} from "../helpers"
import { projectImplementations } from '../constants'
import { log, DataSourceContext, BigInt, dataSource } from '@graphprotocol/graph-ts'

export function handleCreatedProject (event: CreatedProject): void {

  let projectAddress = event.params.project.toHexString()
  log.info(`Starting: handleCreatedProject {}`, [projectAddress])

  // create new context
  let context = new DataSourceContext()
  // add address to context so can be retrieved
  context.setString('project', projectAddress)

  // create mapping with context based on project implementation

  if(projectImplementations[event.params.implementation] == "Standard") {
    StandardProject.createWithContext(
      event.params.project,
      context
    )
  }
  if(projectImplementations[event.params.implementation] == "Seeded") {
    SeededProject.createWithContext(
      event.params.project,
      context
    )
  }

  // create project entity
  let project = findOrCreateProject(projectAddress)

  project.id = projectAddress
  project.editionSize =  event.params.editionSize
  project.projectId = event.params.projectId
  project.implementation = projectImplementations[event.params.implementation]
  project.createdAtBlockNumber = event.block.number
  project.createdAtTimestamp = event.block.timestamp
  project.totalMinted =  BigInt.fromI32(0)
  project.totalBurned =  BigInt.fromI32(0)
  project.totalSupply =  BigInt.fromI32(0)

  let creator = findOrCreateUser(event.params.creator.toHexString())
  project.creator = creator.id
  project.royaltyRecpient =  creator.id

  project.save()

  log.info(`Completed: handleCreatedProject {}`, [projectAddress])
}

export function handleCreatorApprovalsUpdated (event: CreatorApprovalsUpdated): void {
  log.info(`Starting: handleCreatorApprovalsUpdated`, [])

  event.params.creators.forEach(creator => {
    let user = findOrCreateUser(creator.id.toHexString())
    user.curatedCreator = creator.approval
    user.save()

    // update is open status
    if(creator.id.toHexString() == zeroAddress){
      let projectCreator = findOrCreateProjectCreator(dataSource.address().toHexString())
      projectCreator.isOpen = creator.approval
      projectCreator.save()
    }
  })

  log.info(`completed: handleCreatorApprovalsUpdated`, [])
}
