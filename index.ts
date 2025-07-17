import { startProxy } from '@viem/anvil'

import {
  ARCHIVE_RPC_URL,
  FORK_BLOCK_NUMBER,
  FORKED_CHAIN,
  PORT,
} from './constants.ts'
import { CloberGasEstimator } from './gas-simulator/clober.ts'
import { CrystalGasEstimator } from './gas-simulator/crystal.ts'

const main = async () => {
  const N = process.env.N ? parseInt(process.env.N) : 10
  await startProxy({
    options: {
      chainId: FORKED_CHAIN.id,
      forkUrl: ARCHIVE_RPC_URL,
      forkBlockNumber: FORK_BLOCK_NUMBER,
      accounts: 10,
      balance: 100000000, // MON
      autoImpersonate: true,
      gasPrice: 0,
    },
    port: PORT,
  })
  console.log(
    `Anvil proxy started on port ${PORT} with chain ID ${FORKED_CHAIN.id}`,
  )

  // 1. Clober
  const cloberGasEstimator = new CloberGasEstimator()
  await cloberGasEstimator.maxApprove()
  await cloberGasEstimator.clearOrderBook()
  await cloberGasEstimator.placeLimitBidsAtSamePrice(N)
  await cloberGasEstimator.takeAllOrders(N)

  // 2. Crystal
  const crystalGasEstimator = new CrystalGasEstimator()
  await crystalGasEstimator.maxApprove()
  await crystalGasEstimator.clearOrderBook()
  await crystalGasEstimator.placeLimitBidsAtSamePrice(N)
  await crystalGasEstimator.takeAllOrders(N)
}

main()
