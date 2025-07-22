import { startProxy } from '@viem/anvil'
import { type Chain, megaethTestnet } from 'viem/chains'

import { GteGasEstimator } from './gas-simulator/gte.ts'

const PORT = 8546

const CHAIN: Chain = megaethTestnet

const main = async () => {
  const N = process.env.N ? parseInt(process.env.N) : 10
  await startProxy({
    options: {
      chainId: CHAIN.id,
      forkUrl: 'https://carrot.megaeth.com/rpc',
      forkBlockNumber: 11910141,
      accounts: 10,
      balance: 100000000, // ETH
      autoImpersonate: true,
      gasPrice: 0,
    },
    port: PORT,
  })
  console.log(`Anvil proxy started on port ${PORT} with chain ID ${CHAIN.id}`)

  // 1. GTE
  const gteGasEstimator = new GteGasEstimator({
    chain: CHAIN,
    port: PORT,
    whaleWallet: '0x6b6a8d21b0adaee368e00ff6a665910f13a817c6',
  })
  await gteGasEstimator.maxApprove()
  // await gteGasEstimator.clearOrderbook()
  await gteGasEstimator.placeLimitBidsAtSamePrice(N)
  await gteGasEstimator.takeAllOrders(N)
}

main()
