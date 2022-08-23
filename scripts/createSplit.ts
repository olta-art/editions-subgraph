/* This script is used to create a 0xSplits wallet for testing

   Before running:
   - clone https://github.com/0xSplits/splits-contracts
   - deploy SplitMain with:
      yarn run hardhat deploy --network localhost
   - note address and change SplitMainAddress below if needed

   To run this script:
      yarn hardhat run --network localhost scripts/createSplit.ts

  if all goes well it will log an address which can be copied to
  splitWalletAddress in ./seed.ts
*/

import { Contract } from "ethers"
import { ethers } from "hardhat"

// change this if needed
const SplitMainAddress = "0xa51c1fc2f0d1a1b8494ed1fe312d7c3a78ed91c0"

const scale = ethers.BigNumber.from(1e6).toNumber() / 100
const percent = (num: number) => num * scale

// creates a determined split
const getSplit = async () => {
  const addresses = (await ethers.getSigners()).slice(0, 3).map(s => s.address)
  addresses.sort((a, b) => {
    if (a.toLowerCase() > b.toLowerCase()) return 1
    return -1
  })

  return {
    addresses,
    percentAllocations: [
      percent(10),
      percent(20),
      percent(70)
    ],
    distributorFee: percent(1),
    controller: ethers.constants.AddressZero
  }
}

getSplitWallet()

async function getSplitWallet() {
  const [signer] = await ethers.getSigners()

  // get contract
  const SplitMain = new ethers.Contract(
    SplitMainAddress,
    SplitMainABI,
    signer
  )

  const split = await getSplit()

  try {
    // check if split wallet already created
    const splitAddress = await SplitMain.predictImmutableSplitAddress(
      split.addresses,
      split.percentAllocations,
      split.distributorFee,
    )

    const hash = await SplitMain.getHash(splitAddress)

    if(hash === ethers.constants.AddressZero){
      console.log("No split wallet found")
      await createSplit(SplitMain)
    }

    console.log("SplitWallet", splitAddress)
    return splitAddress

  } catch (error: any) {
    if(error?.code === "CALL_EXCEPTION"){
      console.log("MAKE SURE YOU'VE DEPLOYED 0xSplits")
      return
    }

    console.error(error)
  }
}

async function createSplit(SplitMain: Contract){

  const split = await getSplit()

  try{
    // create split
    const tx = await SplitMain.createSplit(
      split.addresses,
      split.percentAllocations,
      split.distributorFee,
      split.controller
    )
    const receipt = await tx.wait()

    // parse event logs
    const {name, args} = SplitMain.interface.parseLog(receipt.logs[0])
    console.log("success", name, args[0])

  } catch (error: any) {
    // parse errors
    console.log(SplitMain.interface.parseError(error.data.data))
  }
}

// taken selected bits from SplitMain.json
var SplitMainABI = JSON.parse(`[
  {
    "inputs": [],
    "name": "Create2Error",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CreateError",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newController",
        "type": "address"
      }
    ],
    "name": "InvalidNewController",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "accountsLength",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "allocationsLength",
        "type": "uint256"
      }
    ],
    "name": "InvalidSplit__AccountsAndAllocationsMismatch",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "InvalidSplit__AccountsOutOfOrder",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "InvalidSplit__AllocationMustBePositive",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "allocationsSum",
        "type": "uint32"
      }
    ],
    "name": "InvalidSplit__InvalidAllocationsSum",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "distributorFee",
        "type": "uint32"
      }
    ],
    "name": "InvalidSplit__InvalidDistributorFee",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      }
    ],
    "name": "InvalidSplit__InvalidHash",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "accountsLength",
        "type": "uint256"
      }
    ],
    "name": "InvalidSplit__TooFewAccounts",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "split",
        "type": "address"
      }
    ],
    "name": "CreateSplit",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "accounts",
        "type": "address[]"
      },
      {
        "internalType": "uint32[]",
        "name": "percentAllocations",
        "type": "uint32[]"
      },
      {
        "internalType": "uint32",
        "name": "distributorFee",
        "type": "uint32"
      }
    ],
    "name": "predictImmutableSplitAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "split",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "accounts",
        "type": "address[]"
      },
      {
        "internalType": "uint32[]",
        "name": "percentAllocations",
        "type": "uint32[]"
      },
      {
        "internalType": "uint32",
        "name": "distributorFee",
        "type": "uint32"
      },
      {
        "internalType": "address",
        "name": "controller",
        "type": "address"
      }
    ],
    "name": "createSplit",
    "outputs": [
      {
        "internalType": "address",
        "name": "split",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "split",
        "type": "address"
      }
    ],
    "name": "getHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]`)