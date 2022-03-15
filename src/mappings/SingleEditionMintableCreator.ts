import {
  SingleEditionMintable
} from '../../types/templates'
import {
  CreatedEdition,
} from '../../types/SingleEditionMintableCreator/SingleEditionMintableCreator'
import {
  findOrCreateTokenContract, findOrCreateUser
} from "../helpers"

import { log, DataSourceContext } from '@graphprotocol/graph-ts'

export function handleCreatedEdition (event: CreatedEdition): void {

  let tokenContractAddress = event.params.editionContractAddress.toHexString()
  log.info(`Starting: handleCreatedEdition`, [tokenContractAddress])

  // add address to context so can be retrieved in singleEditionMintable.ts
  let context = new DataSourceContext()
  context.setString('tokenContract', tokenContractAddress)

  SingleEditionMintable.createWithContext(
    event.params.editionContractAddress,
    context
  )

  // create tokenContract entity
  let tokenContract = findOrCreateTokenContract(tokenContractAddress)

  tokenContract.id = tokenContractAddress
  tokenContract.creator =  event.params.creator.toHexString()
  tokenContract.editionSize =  event.params.editionSize
  tokenContract.tokenContractId = event.params.editionId

  let creator = findOrCreateUser(event.address.toHexString())
  tokenContract.tokenContractCreator = creator.id

  tokenContract.save()
}
