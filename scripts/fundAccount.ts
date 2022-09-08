import { ethers, deployments } from "hardhat"
import { WETH, WETH__factory} from "../typechain"

// TODO: hardhat run doesn't take user arguments :( refactor to a hardhat task to allow for
// `yarn fund-local-address 0x5f0009F23251fEB0f58c8e3aAb8E096Af16FaECD`

const account = "0x5712869b7C8ca52B00Af7F6D924D4C841781ccd4"

const fundAccount= async () => {
  const  [signer] = await ethers.getSigners()
  const WETHAddress = (await deployments.get("WETH")).address
  const WETH = (await ethers.getContractAt(
    WETH__factory.abi,
    WETHAddress
  )) as WETH

  console.log("WETH Address:",WETHAddress)

  const tx = await WETH.deposit({ value: ethers.utils.parseEther("100.0") });
  await tx.wait()

  const balance = await WETH.balanceOf(await signer.getAddress())

  console.log(`Deposited WETH`, ethers.utils.formatEther(balance))

  // send eth
  await signer.sendTransaction({
    to: account,
    value: ethers.utils.parseEther("100")
  })
  // send WETH
  await WETH.transfer(account.toLowerCase(), ethers.utils.parseEther("100"))

  console.log(`Transfered 100 ETH and 100 WETH to`, account)
}

fundAccount()