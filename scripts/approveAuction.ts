import { ethers, deployments, network } from "hardhat"
import { DutchAuctionDrop, DutchAuctionDrop__factory } from "../typechain"

const approveAuction = async () => {
  const DutchAuctionDropAddress = (await deployments.get("DutchAuctionDrop")).address
  const DutchAuctionDrop = (await ethers.getContractAt(
    DutchAuctionDrop__factory.abi,
    DutchAuctionDropAddress
  )) as DutchAuctionDrop

  // approve auction
  const auctionId = 0
  await DutchAuctionDrop.setAuctionApproval(auctionId, true)
}

approveAuction()