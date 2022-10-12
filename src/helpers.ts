import { Address, BigInt, Entity } from '@graphprotocol/graph-ts/index'

import { ERC20 } from '../types/DutchAuctionDrop/ERC20'
import { ERC20NameBytes } from '../types/DutchAuctionDrop/ERC20NameBytes'
import { ERC20SymbolBytes } from '../types/DutchAuctionDrop/ERC20SymbolBytes'

import {
  User,
  Profile,
  DutchAuctionDrop,
  Currency,
  Edition,
  Project,
  Version,
  UrlHashPair,
  UrlUpdate,
  Transfer,
  ProjectMinterApproval,
  ProjectCreator,
  Ask
} from '../types/schema'

export const zeroAddress = '0x0000000000000000000000000000000000000000'

export function findOrCreateProjectCreator(id: string): ProjectCreator {
  let projectCreator = ProjectCreator.load(id)

  if (projectCreator == null) {
    projectCreator = new ProjectCreator(id)
    projectCreator.save()
  }

  return projectCreator as ProjectCreator
}

export function findOrCreateUser(id: string): User {
  let user = User.load(id)

  if (user == null) {
    user = new User(id)
    user.type = "EOA"
    user.save()
  }

  return user as User
}

export function findOrCreateProfile(id: string): Profile {
  let profile = Profile.load(`${id}-profile`)
  let user = findOrCreateUser(id)

  if (profile == null) {
    profile = new Profile(`${id}-profile`)
    profile.user = user.id
    profile.updatedAtTimestamp = new BigInt(0)
    profile.updatedAtBlockNumber = new BigInt(0)
    profile.save()
  }

  return profile as Profile
}

export function findOrCreateCurrency(id: string): Currency {
  let currency = Currency.load(id)

  if(currency == null){
    currency = createCurrency(id)
    currency.save()
  }

  return currency as Currency
}

export function findOrCreateEdition(id: string): Edition {
  let edition = Edition.load(id)

  if(edition == null){
    edition = new Edition(id)
    edition.save()
  }

  return edition as Edition
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

export function findOrCreateAsk(id: string): Ask {
  let ask = Ask.load(id)

  if(ask == null){
    ask = new Ask(id)
    ask.save()
  }

  return ask as Ask
}

export function findOrCreateProjectMinterApproval(id: string): ProjectMinterApproval {
  let projectMinterApproval = ProjectMinterApproval.load(id)

  if(projectMinterApproval == null){
    projectMinterApproval = new ProjectMinterApproval(id)
    projectMinterApproval.save()
  }

  return projectMinterApproval as ProjectMinterApproval
}

export function createDutchAuctionDrop(
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
): DutchAuctionDrop {
  let auction = new DutchAuctionDrop(id)

  auction.id = id
  auction.transactionHash = transactionHash
  auction.project = project.id
  auction.approved = false
  auction.duration = duration
  auction.startTimestamp = startTimestamp
  auction.endTimestamp = endTimestamp
  auction.startPrice = startPrice
  auction.endPrice = endPrice
  auction.numberOfPriceDrops = numberOfPriceDrops
  auction.approvedTimestamp = null
  auction.curatorRoyaltyBPS = curatorRoyaltyBPS
  auction.creator = creator.id
  auction.curator = curator.id
  auction.auctionCurrency = auctionCurrency.id
  auction.status = 'Pending'
  auction.createdAtTimestamp = createdAtTimestamp
  auction.createdAtBlockNumber = createdAtBlockNumber

  auction.save()

  return auction
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
  let decimalValue = 0
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