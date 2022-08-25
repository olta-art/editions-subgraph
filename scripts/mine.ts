import { network } from "hardhat"

const mineOneHour = async () => {
  await network.provider.send("evm_increaseTime", [3600])
  await network.provider.send("evm_mine")
}

mineOneHour()