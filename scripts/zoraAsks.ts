/* This script is used to create an Ask using zora v3

   before running you must deploy Zora/v3 to local hardhat node.
   This is quite tricky as they used foundry and have left out certain deployment scripts
   in the repo.

   contact @george if this is required
*/

import { Contract } from "ethers"
import { ethers } from "hardhat"
import AsksAbi from "../abis/Zora/AsksV1_1.json"
// import ERC721TransferHelperAbi from "../abis/Zora/ERC721TransferHelper.json"
// import ERC20TransferHelperAbi from "../abis/Zora/ERC20TransferHelper.json"
import ModuleManagerAbi from "../abis/Zora/ModuleManager.json"

import {
   StandardProject,
   StandardProject__factory,
   WETH,
   WETH__factory,
 } from "../typechain"

// change this if needed
const AsksAddress = "0x4c5859f0F772848b2D91F1D83E2Fe57935348029"
const WETHAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
const ERC721TransferHelperAddress = "0x8f86403A4DE0BB5791fa46B8e795C547942fE4Cf"
const ERC20TransferHelperAddress = "0x9d4454B023096f34B160D6B654540c56A1F81688"
const ModuleManagerAddress = "0x998abeb3E57409262aE5b751f60747921B33613E"

const projectAddress = "0x4616114E122385d12390fe3995957469C90998Be"

const run = async () => {
   // Signers
   const [curator, creator, collector, ] = await ethers.getSigners()
   console.log(curator.address, creator.address, collector.address)

   // Contracts
   const Project = (await ethers.getContractAt(
      StandardProject__factory.abi,
      projectAddress
   )) as StandardProject;
   const WETH = (await ethers.getContractAt(
      WETH__factory.abi,
      WETHAddress
   )) as WETH
   const Asks = new ethers.Contract(
      AsksAddress,
      AsksAbi
   )
   const ModuleManager = new ethers.Contract(
      ModuleManagerAddress,
      ModuleManagerAbi
   )

   try{
      await ModuleManager.connect(curator).registerModule(AsksAddress)
   } catch (e) {
      console.log("asks module already registered :) ... maybe")
   }


   // approvals
   await Project.connect(collector).setApprovalForAll(ERC721TransferHelperAddress, true)
   await ModuleManager.connect(collector).setApprovalForModule(AsksAddress, true)


   try{
      // ask
      await Asks.connect(collector).createAsk(
         projectAddress,
         1,
         ethers.utils.parseEther("0.1"),
         WETHAddress,
         collector.address,
         2500
      )
      console.log("SUCCESS", "ask created")

      // update
      await Asks.connect(collector).setAskPrice(
         projectAddress,
         1,
         ethers.utils.parseEther("0.5"),
         WETHAddress
      )
      console.log("SUCCESS", "ask updated")

      // cancel
      await Asks.connect(collector).cancelAsk(
         projectAddress,
         1
      )
      console.log("SUCCESS", "ask canceled")

      // create again
      await Asks.connect(collector).createAsk(
         projectAddress,
         1,
         ethers.utils.parseEther("0.1"),
         WETHAddress,
         collector.address,
         2500
      )

      // Fill Ask

      // get some WETH
      const allowance = await WETH.allowance(curator.address, ERC20TransferHelperAddress)
      if(allowance.lt(ethers.utils.parseEther("0.1"))){
         await WETH.connect(curator).deposit({ value: ethers.utils.parseEther("10.0") });
      }

      // approve erc-20
      await WETH.connect(curator).approve(ERC20TransferHelperAddress, ethers.constants.MaxUint256);

      // approve asks module
      await ModuleManager.connect(curator).setApprovalForModule(AsksAddress, true)

      // fill
      await Asks.connect(curator).fillAsk(
         projectAddress,
         1,
         WETHAddress,
         ethers.utils.parseEther("0.1"),
         curator.address
      )

      console.log("success: ask filled")


   } catch (e) {
      console.error("ERROR", e)
   }
}

run()

