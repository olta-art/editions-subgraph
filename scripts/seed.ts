import { ethers, deployments } from "hardhat"
import {
  EditionsAuction,
  SingleEditionMintableCreator,
  SingleEditionMintable,
  WETH,
  EditionsAuction__factory,
  SingleEditionMintableCreator__factory,
  SingleEditionMintable__factory,
  WETH__factory
} from "../typechain"

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, ContractTransaction } from "ethers";

type Label = [BigNumberish, BigNumberish, BigNumberish]

// const editionsAuctionAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
// const SingleEditionMintableCreatorAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F"
// const WETHaddress ="0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"

const getDeployedContracts = async () => {
  const editionsAuctionAddress = (await deployments.get("EditionsAuction")).address
  const EditionsAuction = await ethers.getContractAt(
    EditionsAuction__factory.abi,
    editionsAuctionAddress
  ) as EditionsAuction

  const SingleEditonCreatorAddress = (await deployments.get("SingleEditionMintableCreator")).address
  const SingleEditonCreator = (await ethers.getContractAt(
    SingleEditionMintableCreator__factory.abi,
    SingleEditonCreatorAddress
  )) as SingleEditionMintableCreator;

  const WETHAddress = (await deployments.get("WETH")).address
  const WETH = (await ethers.getContractAt(
    WETH__factory.abi,
    WETHAddress
  )) as WETH

  return {
    EditionsAuction,
    SingleEditonCreator,
    WETH
  }
}

enum urlKeys {
  image,
  animation
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
  }
}

// Hack to get event args
export const getEventArguments = async (tx: ContractTransaction, eventName: string) => {
  const receipt = await tx.wait()
  const event = receipt.events?.find(event => event.event === eventName)
  return event?.args!
}

const createEdition = async (signer: SignerWithAddress, SingleEditonCreator: SingleEditionMintableCreator) => {
  const transaction = await SingleEditonCreator.connect(signer).createEdition(
    "Testing Token",
    "TEST",
    "This is a testing token for all",
    defaultVersion(),
    10,
    10
  );
  const [id, creator, editionSize, editionContractAddress] = await getEventArguments(transaction, "CreatedEdition")
  const editionResult = await SingleEditonCreator.getEditionAtId(id)
  const SingleEditionContract = (await ethers.getContractAt(
    SingleEditionMintable__factory.abi,
    editionResult
  )) as SingleEditionMintable;

  return SingleEditionContract
}

const createAuction = async (
  signer: SignerWithAddress,
  SingleEdition: SingleEditionMintable,
  EditionsAuction: EditionsAuction,
  erc20: WETH,
  options = {}
) => {
  const defaults = {
    editionContract: SingleEdition.address,
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

  return EditionsAuction.connect(signer).createAuction(
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

  const {EditionsAuction, SingleEditonCreator, WETH} = await getDeployedContracts()
  const SingleEditionMintable = await createEdition(creator, SingleEditonCreator)

  let tx = await createAuction(
    creator,
    SingleEditionMintable,
    EditionsAuction,
    WETH
  )

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

  const count = actionCount(10)

  const [auctionId] = await getEventArguments(tx, "AuctionCreated")
  console.log(`${count.increment()} creator created auction:${auctionId}`, tx.hash)

  // approve auction for minting
  tx = await SingleEditionMintable.connect(creator).setApprovedMinter(EditionsAuction.address, true)
  console.log(`${count.increment()} creator approved editionsAuction to mint`, tx.hash)
  tx.wait()

  // give collector some WETH to play with
  tx = await WETH.connect(collector).deposit({ value: ethers.utils.parseEther("40.0") });
  await tx.wait()
  console.log(`${count.increment()} collector has WETH`, tx.hash)

  tx = await WETH.connect(collector).approve(EditionsAuction.address, ethers.utils.parseEther("40.0"))
  await tx.wait()
  console.log(`${count.increment()} collector approved WETH to be spent`, tx.hash)

  // wait 2 sec for auction to start
  await delay(2000)

  // purchase nft
  let salePrice = await EditionsAuction.getSalePrice(auctionId)
  tx = await EditionsAuction.connect(collector).purchase(auctionId, salePrice)
  await tx.wait()
  console.log(`${count.increment()} collector purchased NFT`, tx.hash)

  // add version
  tx = await SingleEditionMintable.connect(creator).addVersion(
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
  tx = await SingleEditionMintable.connect(creator).updateVersionURL(
    [0,0,2] as Label,
    urlKeys.animation,
    "https://arweave.net/fnfNerUHj64h-J2yU9d-rZ6ZBAQRhrWfkw_fgiKyl2k"
  )
  await tx.wait()
  console.log(`${count.increment()} creator updated version url`, tx.hash)

  // grant approval
  tx = await SingleEditionMintable.connect(collector).approve(
    await creator.getAddress(),
    1
  )
  await tx.wait()
  console.log(`${count.increment()} collector granted approval of NFT id(1) to creator`, tx.hash)

  // purchase another nft
  salePrice = await EditionsAuction.getSalePrice(auctionId)
  tx = await EditionsAuction.connect(collector).purchase(auctionId, salePrice)
  await tx.wait()
  console.log(`${count.increment()} collector purchased NFT id(2)`, tx.hash)

  // burn nft
  tx = await SingleEditionMintable.connect(collector).burn(2)
  await tx.wait()
  console.log(`${count.increment()} collector burned NFT id(2)`, tx.hash)
}

run();