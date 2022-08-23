import { ethers, deployments, network } from "hardhat"
import {
  DutchAuctionDrop,
  ProjectCreator,
  StandardProject,
  WETH,
  DutchAuctionDrop__factory,
  ProjectCreator__factory,
  StandardProject__factory,
  WETH__factory,
  SeededProject,
  SeededProject__factory,
  Profiles,
  Profiles__factory
} from "../typechain"

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, ContractTransaction } from "ethers";

type Label = [BigNumberish, BigNumberish, BigNumberish]

// const DutchAuctionDropAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
// const ProjectCreatorAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F"
// const WETHaddress ="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

const mineOneHour = async () => {
  await network.provider.send("evm_increaseTime", [3600])
  await network.provider.send("evm_mine")
}

export const zeroAddress = '0x0000000000000000000000000000000000000000'

const getDeployedContracts = async () => {
  const DutchAuctionDropAddress = (await deployments.get("DutchAuctionDrop")).address
  const DutchAuctionDrop = await ethers.getContractAt(
    DutchAuctionDrop__factory.abi,
    DutchAuctionDropAddress
  ) as DutchAuctionDrop

  const SingleEditonCreatorAddress = (await deployments.get("ProjectCreator")).address
  const SingleEditonCreator = (await ethers.getContractAt(
    ProjectCreator__factory.abi,
    SingleEditonCreatorAddress
  )) as ProjectCreator;

  const WETHAddress = (await deployments.get("WETH")).address
  const WETH = (await ethers.getContractAt(
    WETH__factory.abi,
    WETHAddress
  )) as WETH

  const ProfilesAddress = (await deployments.get("Profiles")).address
  const Profiles = (await ethers.getContractAt(
    Profiles__factory.abi,
    ProfilesAddress
  )) as Profiles

  return {
    DutchAuctionDrop,
    SingleEditonCreator,
    WETH,
    Profiles
  }
}

enum urlKeys {
  image,
  animation
}

export interface Version {
  urls: {
    url: string;
    sha256hash: string;
  }[];
  label: Label;
}

const defaultVersion = () => {
  return {
    urls: [
      // image
      {
        url: "https://ipfs.io/ipfsbafybeify52a63pgcshhbtkff4nxxxp2zp5yjn2xw43jcy4knwful7ymmgy",
        sha256hash: "0x0000000000000000000000000000000000000000000000000000000000000000"
      },
      // animation
      {
        url: "",
        sha256hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      }
    ],
    label: [0,0,1] as Label
  } as Version
}

enum Implementation {
  editions,
  seededEditions
}

const editionData = (
  name: string,
  symbol: string,
  description: string,
  version: Version,
  editionSize: BigNumberish,
  royaltyBPS: BigNumberish
) => ({
  name,
  symbol,
  description,
  version,
  editionSize,
  royaltyBPS
})

// Hack to get event args
export const getEventArguments = async (tx: ContractTransaction, eventName: string) => {
  const receipt = await tx.wait()
  const event = receipt.events?.find(event => event.event === eventName)
  return event?.args!
}

const createProject = async (signer: SignerWithAddress, SingleEditonCreator: ProjectCreator) => {
  const transaction = await SingleEditonCreator.connect(signer).createProject(
    editionData(
      "Testing Token",
      "TEST",
      "This is a testing token for all",
      defaultVersion(),
      10,
      10
    ),
    Implementation.editions
  );
  const [id, creator, editionSize, editionContractAddress] = await getEventArguments(transaction, "CreatedProject")
  const editionResult = await SingleEditonCreator.getProjectAtId(id, Implementation.editions)
  const SingleEditionContract = (await ethers.getContractAt(
    StandardProject__factory.abi,
    editionResult
  )) as StandardProject;

  return SingleEditionContract
}

const createSeededEdition = async (signer: SignerWithAddress, SingleEditonCreator: ProjectCreator) => {
  const transaction = await SingleEditonCreator.connect(signer).createProject(
    editionData(
      "Testing Seeded Token",
      "SEED TEST",
      "This is a testing seeded token for all",
      defaultVersion(),
      10,
      10
    ),
    Implementation.seededEditions
  );
  const [id, creator, editionSize, editionContractAddress] = await getEventArguments(transaction, "CreatedProject")
  console.log(id)
  const editionResult = await SingleEditonCreator.getProjectAtId(id, Implementation.seededEditions)
  const SeededSingleEditionContract = (await ethers.getContractAt(
    SeededProject__factory.abi,
    editionResult
  )) as SeededProject;

  return SeededSingleEditionContract
}

const createAuction = async (
  signer: SignerWithAddress,
  SingleEdition: StandardProject | SeededProject,
  DutchAuctionDrop: DutchAuctionDrop,
  erc20: WETH,
  options = {}
) => {
  const defaults = {
    editionContract: {
      id: SingleEdition.address,
      implementation: Implementation.editions
    },
    startTime: Math.floor((Date.now() / 1000)), // starts straight away
    duration: 60 * 8, // 8 minutes
    startPrice: ethers.utils.parseEther("1.0"),
    endPrice: ethers.utils.parseEther("0.2"),
    numberOfPriceDrops: 4,
    curator: ethers.constants.AddressZero,
    curatorRoyaltyBPS: 0,
    auctionCurrency: erc20.address
  }

  const params = {...defaults, ...options}

  return DutchAuctionDrop.connect(signer).createAuction(
    params.editionContract,
    params.startTime,
    params.duration,
    params.startPrice,
    params.endPrice,
    params.numberOfPriceDrops,
    params.curator,
    params.curatorRoyaltyBPS,
    params.auctionCurrency
  )
}

const delay = (t: number) => {
  return new Promise(resolve => {
      setTimeout(() => resolve(true), t)
  })
}

const run = async () => {
  const [curator, creator, collector] = await ethers.getSigners();

  const {DutchAuctionDrop, SingleEditonCreator, WETH, Profiles} = await getDeployedContracts()

  const actionCount = (_total: number) => {
    let total = _total
    let counter = 0

    const increment = () => {
      counter++
      return counter + "/" + total
    }

    return {
      increment
    }
  }

  const count = actionCount(19)

  let tx = await SingleEditonCreator.setCreatorApprovals([{id: zeroAddress, approval: true}])
  console.log(`${count.increment()} allow everyone to create project`, tx.hash)

  const StandardProject = await createProject(creator, SingleEditonCreator)
  console.log(`${count.increment()} created project`, "address" + StandardProject.address)

  tx = await createAuction(
    creator,
    StandardProject,
    DutchAuctionDrop,
    WETH
  )

  const [auctionId] = await getEventArguments(tx, "AuctionCreated")
  console.log(`${count.increment()} creator created auction:${auctionId}`, tx.hash)

  // approve auction for minting
  tx = await StandardProject.connect(creator).setApprovedMinter(DutchAuctionDrop.address, true)
  console.log(`${count.increment()} creator approved DutchAuctionDrop to mint`, tx.hash)
  tx.wait()

  // give collector some WETH to play with
  tx = await WETH.connect(collector).deposit({ value: ethers.utils.parseEther("40.0") });
  await tx.wait()
  console.log(`${count.increment()} collector has WETH`, tx.hash)

  tx = await WETH.connect(collector).approve(DutchAuctionDrop.address, ethers.utils.parseEther("40.0"))
  await tx.wait()
  console.log(`${count.increment()} collector approved WETH to be spent`, tx.hash)

  // wait 2 sec for auction to start
  await delay(2000)

  // purchase nft
  let salePrice = await DutchAuctionDrop.getSalePrice(auctionId)
  tx = await DutchAuctionDrop.connect(collector)["purchase(uint256,uint256)"](auctionId, salePrice)
  await tx.wait()
  console.log(`${count.increment()} collector purchased NFT`, tx.hash)

  // add version
  tx = await StandardProject.connect(creator).addVersion(
    {
    urls: [
      // image
      {
        url: "https://arweave.net/some-random-id",
        sha256hash: "0x1000000000000000000000000000000000000000000000000000000000000000"
      },
      // animation
      {
        url: "",
        sha256hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      }
    ],
    label: [0,0,2] as Label
  })
  await tx.wait()
  console.log(`${count.increment()} creator added version to NFT`, tx.hash)

  // update version url
  tx = await StandardProject.connect(creator).updateVersionURL(
    [0,0,2] as Label,
    urlKeys.animation,
    "https://arweave.net/fnfNerUHj64h-J2yU9d-rZ6ZBAQRhrWfkw_fgiKyl2k"
  )
  await tx.wait()
  console.log(`${count.increment()} creator updated version url`, tx.hash)

  // grant approval
  tx = await StandardProject.connect(collector).approve(
    await creator.getAddress(),
    1
  )
  await tx.wait()
  console.log(`${count.increment()} collector granted approval of NFT id(1) to creator`, tx.hash)

  // purchase another nft
  salePrice = await DutchAuctionDrop.getSalePrice(auctionId)
  tx = await DutchAuctionDrop.connect(collector)["purchase(uint256,uint256)"](auctionId, salePrice)
  await tx.wait()
  console.log(`${count.increment()} collector purchased NFT id(2)`, tx.hash)

  // burn nft
  tx = await StandardProject.connect(collector).burn(2)
  await tx.wait()
  console.log(`${count.increment()} collector burned NFT id(2)`, tx.hash)

  // add seeded edition and auction
  const SeededProject = await createSeededEdition(creator, SingleEditonCreator)
  tx = await createAuction(
    creator,
    SeededProject,
    DutchAuctionDrop,
    WETH,
    { editionContract: {
      id: SeededProject.address,
      implementation: Implementation.seededEditions
    }}
  )
  console.log(`${count.increment()} creator created seeded edition and put it up for auction`, tx.hash)
  const [seededAuctionId] = await getEventArguments(tx, "AuctionCreated")

  // wait 2 sec for auction to start
  await delay(2000)

  // approve auction for minting
  tx = await SeededProject.connect(creator).setApprovedMinter(DutchAuctionDrop.address, true)
  console.log(`${count.increment()} creator approved DutchAuctionDrop to mint`, tx.hash)
  tx.wait()

  // purchase seeded nft
  salePrice = await DutchAuctionDrop.getSalePrice(seededAuctionId)
  tx = await DutchAuctionDrop.connect(collector)["purchase(uint256,uint256,uint256)"](seededAuctionId, salePrice, 5)
  await tx.wait()
  console.log(`${count.increment()} collector purchased seeded NFT seed(5)`, tx.hash)

  // change royalty fund recipient
  await SeededProject.connect(creator).setRoyaltyFundsRecipient(curator.address)
  console.log(`${count.increment()} creator set royalty fund recipient to curator`, tx.hash)

  // mine an hour in time
  // NOTE[george]: this is a precution if the seed script has already been run
  await mineOneHour()

  // add creator profile
  await Profiles.connect(creator).update({
    name: "creator",
    description: "creator of nft's and other such things",
    thumbnailURI: "",
    linkURI: `https://beta.art/profile.html?wallet=${creator.address}`
  })
  console.log(`${count.increment()} creator created a profile`, tx.hash)

   // add collector profile
   await Profiles.connect(collector).update({
    name: "collector",
    description: "collector of nft's and other such things",
    thumbnailURI: "",
    linkURI: `https://beta.art/profile.html?wallet=${collector.address}`
  })
  console.log(`${count.increment()} collector created a profile`, tx.hash)

  // mine an hour in time
  await mineOneHour()

   // update collector profile with an emoji
   await Profiles.connect(collector).update({
    name: "",
    description: "the best collector of octopus related nft's in the world 🐙",
    thumbnailURI: "",
    linkURI: ""
  })
  console.log(`${count.increment()} collector updated their profile`, tx.hash)

}

run();