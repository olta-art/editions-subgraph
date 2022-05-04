import {
  SingleEditionMintable,
  SeededSingleEditionMintable
} from '../../types/templates'
import {
  CreatedEdition,
} from '../../types/SingleEditionMintableCreator/SingleEditionMintableCreator'
import {
  findOrCreateTokenContract,
  findOrCreateUser
} from "../helpers"
import { tokenContractImplementations } from '../constants'
import { log, DataSourceContext, BigInt } from '@graphprotocol/graph-ts'

export function handleCreatedEdition (event: CreatedEdition): void {

  let tokenContractAddress = event.params.editionContractAddress.toHexString()
  log.info(`Starting: handleCreatedEdition`, [tokenContractAddress])

  // create new context
  let context = new DataSourceContext()
  // add address to context so can be retrieved
  context.setString('tokenContract', tokenContractAddress)

  if("editions" == tokenContractImplementations[event.params.implementation]) {
    SingleEditionMintable.createWithContext(
      event.params.editionContractAddress,
      context
    )
  }

  if("seededEditions" == tokenContractImplementations[event.params.implementation]) {
    SeededSingleEditionMintable.createWithContext(
      event.params.editionContractAddress,
      context
    )
  }

  // create tokenContract entity
  let tokenContract = findOrCreateTokenContract(tokenContractAddress)

  tokenContract.id = tokenContractAddress
  tokenContract.editionSize =  event.params.editionSize
  tokenContract.tokenContractId = event.params.editionId
  tokenContract.implementation = tokenContractImplementations[event.params.implementation]
  tokenContract.createdAtBlockNumber = event.block.number
  tokenContract.createdAtTimestamp = event.block.timestamp
  tokenContract.totalMinted =  BigInt.fromI32(0)
  tokenContract.totalBurned =  BigInt.fromI32(0)
  tokenContract.totalSupply =  BigInt.fromI32(0)

  let creator = findOrCreateUser(event.params.creator.toHexString())
  tokenContract.creator = creator.id

  tokenContract.save()

  log.info(`Completed: handleCreatedEdition`, [tokenContractAddress])
}
