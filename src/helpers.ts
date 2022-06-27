import { Address, BigInt } from '@graphprotocol/graph-ts/index'

import { ERC20 } from '../types/EditionsAuction/ERC20'
import { ERC20NameBytes } from '../types/EditionsAuction/ERC20NameBytes'
import { ERC20SymbolBytes } from '../types/EditionsAuction/ERC20SymbolBytes'

import { SingleEditionMintable__getURIsResult } from '../types/templates/SingleEditionMintable/SingleEditionMintable'
import { SeededSingleEditionMintable__getURIsResult } from '../types/templates/SeededSingleEditionMintable/SeededSingleEditionMintable'

import {
  User,
  EditionsAuction,
  Currency,
  Token,
  Project,
  Version,
  UrlHashPair,
  UrlUpdate,
  Transfer,
  ProjectMinterApproval
} from '../types/schema'

import { ethereum } from '@graphprotocol/graph-ts/index'

export const zeroAddress = '0x0000000000000000000000000000000000000000'
/**
 * Find or Create a User entity with `id` and return it
 * @param id
 */
 export function findOrCreateUser(id: string): User {
  let user = User.load(id)

  if (user == null) {
    user = new User(id)
    user.save()
  }

  return user as User
}

export function findOrCreateCurrency(id: string): Currency {
  let currency = Currency.load(id)

  if(currency == null){
    currency = createCurrency(id)
    currency.save()
  }

  return currency as Currency
}


export function findOrCreateToken(id: string): Token {
  let token = Token.load(id)

  if(token == null){
    token = new Token(id)
    token.save()
  }

  return token as Token
}

export function findOrCreateVersion(id: string): Version {
  let version = Version.load(id)

  if(version == null){
    version = new Version(id)
    version.save()
  }

  return version as Version
}

export function findOrCreateUrlHashPair(id: string): UrlHashPair {
  let urlHashPair = UrlHashPair.load(id)

  if(urlHashPair == null){
    urlHashPair = new UrlHashPair(id)
    urlHashPair.save()
  }

  return urlHashPair as UrlHashPair
}

export function findOrCreateUrlUpdate(id: string): UrlUpdate {
  let urlUpdate = UrlUpdate.load(id)

  if(urlUpdate == null){
    urlUpdate = new UrlUpdate(id)
    urlUpdate.save()
  }

  return urlUpdate as UrlUpdate
}

export function findOrCreateProject(id: string): Project {
  let project = Project.load(id)

  if(project == null){
    project = new Project(id)
    project.save()
  }

  return project as Project
}

export function findOrCreateTransfer(id: string): Transfer {
  let transfer = Transfer.load(id)

  if(transfer == null){
    transfer = new Transfer(id)
    transfer.save()
  }

  return transfer as Transfer
}

export function findOrCreateProjectMinterApproval(id: string): ProjectMinterApproval {
  let projectMinterApproval = ProjectMinterApproval.load(id)

  if(projectMinterApproval == null){
    projectMinterApproval = new ProjectMinterApproval(id)
    projectMinterApproval.save()
  }

  return projectMinterApproval as ProjectMinterApproval
}

export function createEditionsAuction(
  id: string,
  transactionHash: string,
  project: Project,
  duration: BigInt,
  startTimestamp: BigInt,
  endTimestamp: BigInt,
  startPrice: BigInt,
  endPrice: BigInt,
  numberOfPriceDrops: i32,
  curatorRoyaltyBPS: BigInt,
  auctionCurrency: Currency,
  createdAtTimestamp: BigInt,
  createdAtBlockNumber: BigInt,
  creator: User,
  curator: User
): EditionsAuction {
  let editionsAuction = new EditionsAuction(id)

  editionsAuction.id = id
  editionsAuction.transactionHash = transactionHash
  editionsAuction.project = project.id
  editionsAuction.approved = false
  editionsAuction.duration = duration
  editionsAuction.startTimestamp = startTimestamp
  editionsAuction.endTimestamp = endTimestamp
  editionsAuction.startPrice = startPrice
  editionsAuction.endPrice = endPrice
  editionsAuction.numberOfPriceDrops = numberOfPriceDrops
  editionsAuction.approvedTimestamp = null
  editionsAuction.curatorRoyaltyBPS = curatorRoyaltyBPS
  editionsAuction.creator = creator.id
  editionsAuction.curator = curator.id
  editionsAuction.auctionCurrency = auctionCurrency.id
  editionsAuction.status = 'Pending'
  editionsAuction.createdAtTimestamp = createdAtTimestamp
  editionsAuction.createdAtBlockNumber = createdAtBlockNumber

  editionsAuction.save()

  return editionsAuction
}

/**
 * Create a Currency Entity in storage.
 * Populate fields by fetching data from the blockchain.
 * @param id
 */
 export function createCurrency(id: string): Currency {
  let currency = new Currency(id)
  // currency.liquidity = BigInt.fromI32(0)

  if (id === zeroAddress) {
    currency.name = 'Ethereum'
    currency.symbol = 'ETH'
    currency.decimals = 18
    currency.save()
    return currency
  }

  let name = fetchCurrencyName(Address.fromString(id))
  let symbol = fetchCurrencySymbol(Address.fromString(id))
  let decimals = fetchCurrencyDecimals(Address.fromString(id))

  currency.name = name
  currency.symbol = symbol
  currency.decimals = decimals

  currency.save()
  return currency
}

/**
 * Fetch the `decimals` from the specified ERC20 contract on the blockchain
 * @param currencyAddress
 */
 export function fetchCurrencyDecimals(currencyAddress: Address): i32 {
  let contract = ERC20.bind(currencyAddress)
  // try types uint8 for decimals
  let decimalValue = null
  let decimalResult = contract.try_decimals()
  if (!decimalResult.reverted) {
    decimalValue = decimalResult.value
  }
  return decimalValue as i32
}

/**
 * Fetch the `symbol` from the specified ERC20 contract on the Blockchain
 * @param currencyAddress
 */
export function fetchCurrencySymbol(currencyAddress: Address): string {
  let contract = ERC20.bind(currencyAddress)
  let contractSymbolBytes = ERC20SymbolBytes.bind(currencyAddress)

  // try types string and bytes32 for symbol
  let symbolValue = 'unknown'
  let symbolResult = contract.try_symbol()
  if (symbolResult.reverted) {
    let symbolResultBytes = contractSymbolBytes.try_symbol()
    if (!symbolResultBytes.reverted) {
      // for broken pairs that have no symbol function exposed
      if (!isNullEthValue(symbolResultBytes.value.toHexString())) {
        symbolValue = symbolResultBytes.value.toString()
      }
    }
  } else {
    symbolValue = symbolResult.value
  }

  return symbolValue
}

/**
 * Fetch the `name` of the specified ERC20 contract on the blockchain
 * @param currencyAddress
 */
export function fetchCurrencyName(currencyAddress: Address): string {
  let contract = ERC20.bind(currencyAddress)
  let contractNameBytes = ERC20NameBytes.bind(currencyAddress)

  // try types string and bytes32 for name
  let nameValue = 'unknown'
  let nameResult = contract.try_name()
  if (nameResult.reverted) {
    let nameResultBytes = contractNameBytes.try_name()
    if (!nameResultBytes.reverted) {
      if (!isNullEthValue(nameResultBytes.value.toHexString())) {
        nameValue = nameResultBytes.value.toString()
      }
    }
  } else {
    nameValue = nameResult.value
  }

  return nameValue
}

function isNullEthValue(value: string): boolean {
  return value == '0x0000000000000000000000000000000000000000000000000000000000000001'
}

export function i32ToString (value: i32): string {
  return BigInt.fromI32(value).toString()
}

// formats label to semantic versioning style
export function formatLabel (label: i32[]): string {
  return `${i32ToString(label.at(0))}.${i32ToString(label.at(1))}.${i32ToString(label.at(2))}`
}

export function addVersion(
  id: string,
  label: string,
  projectId: string,
  imageUrl: string,
  imageHash: string,
  animationUrl: string,
  animationHash: string,
  patchNotesUrl: string,
  patchNotesHash: string,
  createdAtTimestamp: BigInt,
  createdAtBlockNumber: BigInt
): void {

  // create urlHash pair for image
  const image = addUrlHashPair(
    id,
    "Image",
    imageUrl,
    imageHash,
    createdAtTimestamp,
    createdAtBlockNumber
  )

  // create urlHash pair for animation
  const animation = addUrlHashPair(
    id,
    "Animation",
    animationUrl,
    animationHash,
    createdAtTimestamp,
    createdAtBlockNumber
  )

  // create urlHash pair for animation
  const patchNotes = addUrlHashPair(
    id,
    "PatchNotes",
    patchNotesUrl,
    patchNotesHash,
    createdAtTimestamp,
    createdAtBlockNumber
  )

  let version = findOrCreateVersion(id)

  version.id = id
  version.label = label
  version.project = projectId
  version.createdAtTimestamp = createdAtTimestamp
  version.createdAtBlockNumber = createdAtBlockNumber
  version.image = image.id
  version.animation = animation.id
  version.patchNotes = patchNotes.id

  version.save()
}

export function addUrlHashPair(
  versionId: string,
  type: string, // TODO: enum check?
  url: string,
  hash: string,
  createdAtTimestamp: BigInt,
  createdAtBlockNumber: BigInt
): UrlHashPair {
  let urlHashPair = findOrCreateUrlHashPair(`${versionId}-${type}`)
  urlHashPair.id = `${versionId}-${type}`
  urlHashPair.version = versionId
  urlHashPair.type = type
  urlHashPair.createdAtTimestamp = createdAtTimestamp
  urlHashPair.createdAtBlockNumber = createdAtBlockNumber
  urlHashPair.url = url
  urlHashPair.hash = hash

  urlHashPair.save()

  return urlHashPair
}