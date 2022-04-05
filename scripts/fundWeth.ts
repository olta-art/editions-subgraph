import { ethers, deployments } from "hardhat"
import {
  WETH,
  WETH__factory
} from "../typechain"

// Connected with this address in metamask
// returns signer of 0x90F79bf6EB2c4f870365E785982E1f101E93b906
const getSigner = async () => {
  const [_, __, ___, signer] = await ethers.getSigners()
  return signer
}

const fundWETH = async () => {
  const signer = await getSigner()
  const WETHAddress = (await deployments.get("WETH")).address
  const WETH = (await ethers.getContractAt(
    WETH__factory.abi,
    WETHAddress
  )) as WETH

  const tx = await WETH.connect(signer).deposit({ value: ethers.utils.parseEther("40.0") });
  await tx.wait()

  const balance = await WETH.connect(signer).balanceOf(await signer.getAddress())
  console.log(`Deposited WETH`, ethers.utils.formatEther(balance))
}

fundWETH()