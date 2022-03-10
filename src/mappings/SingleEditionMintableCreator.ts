import {
  SingleEditionMintable
} from '../../types/templates'
import {
  SingleEditionMintableCreator,
  CreatedEdition,
  CreateEditionCall
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

// TODO: find way to test this locally
// NOTE: not currently used as hardhat doesn't support the trace_filter method seems like the best way
// export function handleCreateEditionCall(call: CreateEditionCall): void {

//   // get token contract address
//   let singleEditionMintableCreator = SingleEditionMintableCreator.bind(call.to)
//   let tokenContractAddress = singleEditionMintableCreator.getEditionAtId(call.outputs.value0)

//   // index data to tokenContract
//   let tokenContract = findOrCreateTokenContract(tokenContractAddress.toHexString())
//   tokenContract.animationURL = call.inputs._animationUrl
//   tokenContract.animationHash = call.inputs._animationHash.toHexString()
//   tokenContract.imageURL = call.inputs._imageUrl
//   tokenContract.imageHash = call.inputs._imageHash.toHexString()

//   tokenContract.save()

//   //TODO: royalties -> singleEditionMintableContract.royaltyInfo()
// }
