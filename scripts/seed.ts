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

// TODO: purchase

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


const defaultVersion = () => {
  return {
    urls: [
      // animation
      {
        url: "https://ipfs.io/ipfsbafybeify52a63pgcshhbtkff4nxxxp2zp5yjn2xw43jcy4knwful7ymmgy",
        sha256hash: "0x0000000000000000000000000000000000000000000000000000000000000000"
      },
      // image
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
  const [id] = await getEventArguments(transaction, "CreatedEdition")
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

const purchaseEdition = async (
  signer: SignerWithAddress,
  EditionsAuction: EditionsAuction,
  auctionId: number
) => {
  const salePrice = await EditionsAuction.getSalePrice(0)
  return await EditionsAuction.connect(signer).purchase(0, salePrice)
}

const addVersion = async (
  signer: SignerWithAddress,
  nft: SingleEditionMintable,
  label: [BigNumberish, BigNumberish, BigNumberish]
) => {
  const newVersion = {
    urls: [
        {
          url: "https://arweave.net/fnfNerUHj64h-J2yU9d-rZ6ZBAQRhrWfkw_fgiKyl2k",
          sha256hash: "0x0000000000000000000000000000000000000000000000000000000000000001"
        },
        {
          url: "",
          sha256hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        }
      ],
      label
  }
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
  console.log("1/5 auction created", tx.hash)
  await tx.wait()

  // approve auction for minting
  tx = await SingleEditionMintable.connect(creator).setApprovedMinter(EditionsAuction.address, true)
  console.log("2/5 creator approved editionsAuction to mint", tx.hash)
  tx.wait()

  // give collector some WETH to play with
  tx = await WETH.connect(collector).deposit({ value: ethers.utils.parseEther("40.0") });
  await tx.wait()
  console.log("3/5 collector has WETH", tx.hash)

  tx = await WETH.connect(collector).approve(EditionsAuction.address, ethers.utils.parseEther("40.0"))
  await tx.wait()
  console.log("4/5 collectors WETH approved to be spent", tx.hash)

  // wait 2 sec for auction to start
  setTimeout(async () => {
    // purchase nft
    tx = await purchaseEdition(collector, EditionsAuction, 0)
    await tx.wait()
    console.log("5/5 collectors purchases NFT", tx.hash)
  }, 2000);
}

run();