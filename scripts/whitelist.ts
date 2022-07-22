import { ethers, deployments } from "hardhat"
import { ProjectCreator, ProjectCreator__factory } from "../typechain"

const whitelist = async () => {
  const ProjectCreatorAddress = (await deployments.get("ProjectCreator")).address
  const ProjectCreator = (await ethers.getContractAt(
    ProjectCreator__factory.abi,
    ProjectCreatorAddress
  )) as ProjectCreator

  // close open creating
  await ProjectCreator.setCreatorApprovals([{id: ethers.constants.AddressZero, approval: false}])

  await ProjectCreator.setCreatorApprovals([{id: "0x5f0009F23251fEB0f58c8e3aAb8E096Af16FaECD", approval: true }])
}

whitelist()