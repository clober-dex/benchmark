import { startProxy } from '@viem/anvil'
import { type Chain, monadTestnet } from 'viem/chains'

import { CloberGasEstimator } from './gas-simulator/clober.ts'
import { CrystalGasEstimator } from './gas-simulator/crystal.ts'
import { KuruGasEstimator } from './gas-simulator/kuru.ts'

const PORT = 8545

const CHAIN: Chain = monadTestnet

const main = async () => {
  const N = process.env.N ? parseInt(process.env.N) : 10
  await startProxy({
    options: {
      chainId: CHAIN.id,
      forkUrl:
        'https://proud-tiniest-flower.monad-testnet.quiknode.pro/a4ebe00fca2e7bf01201f3b0f7fe2f0077c52a36',
      forkBlockNumber: 26608965,
      accounts: 10,
      balance: 100000000, // MON
      autoImpersonate: true,
      gasPrice: 0,
    },
    port: PORT,
  })
  console.log(`Anvil proxy started on port ${PORT} with chain ID ${CHAIN.id}`)

  // 1. Clober
  const cloberGasEstimator = new CloberGasEstimator({
    chain: CHAIN,
    port: PORT,
    whaleWallet: '0xFA735CcA8424e4eF30980653bf9015331d9929dB',
  })
  await cloberGasEstimator.maxApprove()
  await cloberGasEstimator.clearOrderBook()
  await cloberGasEstimator.placeLimitBidsAtSamePrice(N)
  await cloberGasEstimator.takeAllOrders(N)

  // 2. Crystal
  const crystalGasEstimator = new CrystalGasEstimator({
    chain: CHAIN,
    port: PORT,
    whaleWallet: '0xFA735CcA8424e4eF30980653bf9015331d9929dB',
  })
  await crystalGasEstimator.maxApprove()
  await crystalGasEstimator.clearOrderBook()
  await crystalGasEstimator.placeLimitBidsAtSamePrice(N)
  await crystalGasEstimator.takeAllOrders(N)

  // 3. Kuru
  const kuruGasEstimator = new KuruGasEstimator({
    chain: CHAIN,
    port: PORT,
    whaleWallet: '0xFA735CcA8424e4eF30980653bf9015331d9929dB',
  })
  // await kuruGasEstimator.initialize()
  await kuruGasEstimator.maxApprove()
  await kuruGasEstimator.placeLimitBidsAtSamePrice(N)
  await kuruGasEstimator.takeAllOrders(N)

  console.log(`All gas estimators completed for ${N} orders.`)
}

main()
