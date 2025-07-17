import type { PublicClient, TestClient, WalletClient } from 'viem'
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
} from 'viem'

import { FORKED_CHAIN, PORT, WHALE_WALLET } from '../constants.ts'
import { maxApproveToken } from '../utils/allowance.ts'

export class GasEstimator {
  baseToken: `0x${string}` | null = null
  quoteToken: `0x${string}` | null = null

  publicClient: PublicClient
  testClient: TestClient
  walletClient: WalletClient

  constructor() {
    const alias = BigInt(
      `0x${Buffer.from(this.constructor.name, 'utf8').toString('hex')}`,
    ).toString(10)
    this.publicClient = createPublicClient({
      chain: FORKED_CHAIN,
      transport: http(`http://127.0.0.1:${PORT}/${alias}`),
    })
    this.testClient = createTestClient({
      chain: FORKED_CHAIN,
      mode: 'anvil',
      transport: http(`http://127.0.0.1:${PORT}/${alias}`),
    })
    this.walletClient = createWalletClient({
      chain: FORKED_CHAIN,
      account: WHALE_WALLET,
      transport: http(`http://127.0.0.1:${PORT}/${alias}`),
    })
  }

  /**
   * Approves the maximum amount for multiple token addresses to a specified spender address.
   * @param spenderAddress
   */
  public async maxApprove(spenderAddress: `0x${string}`): Promise<void> {
    for (const tokenAddress of [this.baseToken, this.quoteToken].filter(
      (token): token is `0x${string}` => token !== null,
    )) {
      await maxApproveToken({
        tokenAddress: tokenAddress!,
        spender: spenderAddress,
        walletClient: this.walletClient,
      }).then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))
    }
  }

  /**
   * Clears the order book by removing all existing orders.
   * This could involve canceling or overriding existing orders.
   */
  public async clearOrderBook(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  /**
   * Places multiple limit bid orders on the order book.
   * @param n - The number of limit bid orders to place
   */
  public async placeLimitBidsAtSamePrice(n: number): Promise<void> {
    throw new Error(`Method not implemented. ${n}`)
  }

  /**
   * Executes market orders to take all available orders from the book.
   * This simulates taking liquidity from the book.
   */
  public async takeAllOrders(n: number): Promise<void> {
    throw new Error(`Method not implemented. ${n}`)
  }
}
