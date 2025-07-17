import { getAddress } from 'viem'
import { getMarket, limitOrder, marketOrder } from '@clober/v2-sdk'
import { BigNumber } from 'bignumber.js'

import { waitForTransaction } from '../utils/transaction.ts'
import { saveGasUsedResult } from '../utils/db.ts'

import { GasEstimator } from './index.ts'

export class CloberGasEstimator extends GasEstimator {
  contract = getAddress('0x08feDaACe14EB141E51282441b05182519D853D1')
  baseToken = getAddress('0xf817257fed379853cDe0fa4F97AB987181B1E5Ea')
  quoteToken = getAddress('0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D')

  public async clearOrderBook(): Promise<void> {
    await marketOrder({
      chainId: this.publicClient.chain!.id,
      userAddress: this.walletClient.account!.address,
      inputToken: this.baseToken,
      outputToken: this.quoteToken,
      amountIn: '1000000',
      options: {
        useSubgraph: false,
        rpcUrl: this.publicClient.transport.url,
      },
    }).then(({ transaction }) =>
      waitForTransaction({
        transaction,
        publicClient: this.publicClient,
        walletClient: this.walletClient,
      }),
    )

    await marketOrder({
      chainId: this.publicClient.chain!.id,
      userAddress: this.walletClient.account!.address,
      inputToken: this.quoteToken,
      outputToken: this.baseToken,
      amountIn: '1000000',
      options: {
        useSubgraph: false,
        rpcUrl: this.publicClient.transport.url,
      },
    }).then(({ transaction }) =>
      waitForTransaction({
        transaction,
        publicClient: this.publicClient,
        walletClient: this.walletClient,
      }),
    )

    const market = await getMarket({
      chainId: this.publicClient.chain!.id,
      token0: this.baseToken,
      token1: this.quoteToken,
      options: {
        rpcUrl: this.publicClient.transport.url,
      },
    })
    if (market.bids.length > 0 || market.asks.length > 0) {
      throw new Error('Order book is not cleared')
    }
    console.log(`[${this.constructor.name}] Order book cleared.`)
  }

  public async placeLimitBidsAtSamePrice(n: number): Promise<void> {
    console.log(`[${this.constructor.name}] Placing ${n} limit bids...`)
    let totalGasUsed = 0n
    for (let i = 0; i < n; i++) {
      await limitOrder({
        chainId: this.publicClient.chain!.id,
        userAddress: this.walletClient.account!.address,
        inputToken: this.quoteToken,
        outputToken: this.baseToken,
        amount: '1',
        price: '1',
        options: {
          useSubgraph: false,
          rpcUrl: this.publicClient.transport.url,
        },
      }).then(async ({ transaction }) => {
        const receipt = await waitForTransaction({
          transaction,
          publicClient: this.publicClient,
          walletClient: this.walletClient,
        })
        console.log(
          `[${this.constructor.name}] Placed limit bid ${i + 1}/${n}`,
          receipt.transactionHash,
        )
        totalGasUsed += BigInt(receipt.gasUsed)
      })
    }
    saveGasUsedResult({
      alias: `clober-make-${n}`,
      gasUsed: new BigNumber(totalGasUsed.toString()).dividedBy(n).toFixed(0),
    })
  }

  public async takeAllOrders(n: number): Promise<void> {
    await marketOrder({
      chainId: this.publicClient.chain!.id,
      userAddress: this.walletClient.account!.address,
      inputToken: this.baseToken,
      outputToken: this.quoteToken,
      amountIn: '1000000',
      options: {
        useSubgraph: false,
        rpcUrl: this.publicClient.transport.url,
      },
    }).then(
      async ({
        transaction,
        result: {
          taken: { events },
        },
      }) => {
        if (events.length !== 1) {
          throw new Error(
            `Expected to take ${n} orders, but took ${events.length}`,
          )
        }
        const receipt = await waitForTransaction({
          transaction,
          publicClient: this.publicClient,
          walletClient: this.walletClient,
        })
        saveGasUsedResult({
          alias: `clober-take-${n}`,
          gasUsed: receipt.gasUsed.toString(),
        })
      },
    )
  }
}
