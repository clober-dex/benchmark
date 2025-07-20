import type { PublicClient, TestClient, WalletClient } from 'viem'
import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  http,
} from 'viem'
import type { Chain } from 'viem/chains'

import { maxApproveToken } from '../utils/allowance.ts'

export class GasEstimator {
  contract: `0x${string}` | null = null
  baseToken: `0x${string}` | null = null
  quoteToken: `0x${string}` | null = null

  publicClient: PublicClient
  testClient: TestClient
  walletClient: WalletClient

  constructor({
    chain,
    port,
    whaleWallet,
  }: {
    chain: Chain
    port: number
    whaleWallet: `0x${string}`
  }) {
    const alias = BigInt(
      `0x${Buffer.from(this.constructor.name, 'utf8').toString('hex')}`,
    ).toString(10)
    this.publicClient = createPublicClient({
      chain,
      transport: http(`http://127.0.0.1:${port}/${alias}`),
    })
    this.testClient = createTestClient({
      chain,
      mode: 'anvil',
      transport: http(`http://127.0.0.1:${port}/${alias}`),
    })
    this.walletClient = createWalletClient({
      chain,
      account: whaleWallet,
      transport: http(`http://127.0.0.1:${port}/${alias}`),
    })
  }

  /**
   * Approves the maximum amount for multiple token addresses to a specified spender address.
   */
  public async maxApprove(): Promise<void> {
    for (const tokenAddress of [this.baseToken, this.quoteToken].filter(
      (token): token is `0x${string}` => token !== null,
    )) {
      await maxApproveToken({
        tokenAddress: tokenAddress!,
        spender: this.contract!,
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
