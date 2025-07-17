import { erc20Abi, getAddress, parseUnits } from 'viem'
import { BigNumber } from 'bignumber.js'
import {
  GTC,
  IOC,
  MarginDeposit,
  type MarketParams,
  OrderBook,
  ParamFetcher,
} from '@kuru-labs/kuru-sdk'
import { ethers } from 'ethers'
import { generatePrivateKey } from 'viem/accounts'

import { saveGasUsedResult } from '../utils/db.ts'
import { getTokenBalanceMap } from '../utils/balance.ts'

import { GasEstimator } from './index.ts'

export class KuruGasEstimator extends GasEstimator {
  contract = getAddress('0x98026E9F2E27481Ca3152A753B7c6cE74aCb7710')
  baseToken = getAddress('0x0EfeD4D9fB7863ccC7bb392847C08dCd00FE9bE2')
  quoteToken = getAddress('0xf817257fed379853cDe0fa4F97AB987181B1E5Ea')

  marketParams: MarketParams | null = null
  provider: ethers.providers.JsonRpcProvider | null = null
  signer: ethers.Wallet | null = null
  privateKey: `0x${string}` | null = null

  public async initialize(): Promise<void> {
    this.provider = new ethers.providers.JsonRpcProvider(
      this.publicClient.transport.url,
    )
    this.privateKey = generatePrivateKey()
    this.signer = new ethers.Wallet(this.privateKey, this.provider)

    // transfer mon
    await this.walletClient
      .sendTransaction({
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        to: this.signer.address as `0x${string}`,
        value: parseUnits('1000', 18),
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    // approve
    await this.walletClient
      .writeContract({
        address: this.quoteToken,
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        abi: erc20Abi,
        functionName: 'approve',
        args: ['0x49FDEEe09430dd74d2a7FaB8b5157F9D47BcA87f', 2n ** 256n - 1n],
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    // mint
    await this.walletClient
      .writeContract({
        address: '0x49FDEEe09430dd74d2a7FaB8b5157F9D47BcA87f',
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        abi: [
          {
            inputs: [
              {
                internalType: 'uint256',
                name: 'tokenAmount',
                type: 'uint256',
              },
            ],
            name: 'createWithUSDC',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ] as const,
        functionName: 'createWithUSDC',
        args: [parseUnits('10000000', 6)],
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    // transfer quote
    await this.walletClient
      .writeContract({
        address: this.quoteToken,
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [this.signer.address as `0x${string}`, parseUnits('10000000', 6)],
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    // transfer base
    await this.walletClient
      .writeContract({
        address: this.baseToken,
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [this.signer.address as `0x${string}`, parseUnits('9000000', 18)],
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    const tokenBalanceMap = await getTokenBalanceMap({
      publicClient: this.publicClient,
      tokenAddresses: [this.baseToken, this.quoteToken],
      userAddress: this.signer.address as `0x${string}`,
    })

    if (tokenBalanceMap[this.baseToken] === 0n) {
      throw new Error(`Not enough base token balance`)
    }
    if (tokenBalanceMap[this.quoteToken] === 0n) {
      throw new Error(`Not enough quote token balance`)
    }

    this.marketParams = await ParamFetcher.getMarketParams(
      this.provider,
      this.contract,
    )

    await MarginDeposit.deposit(
      this.signer,
      '0x4B186949F31FCA0aD08497Df9169a6bEbF0e26ef',
      this.signer.address,
      this.quoteToken,
      '100000',
      6,
      true,
    )

    await MarginDeposit.deposit(
      this.signer,
      '0x4B186949F31FCA0aD08497Df9169a6bEbF0e26ef',
      this.signer.address,
      this.baseToken,
      '100000',
      18,
      true,
    )

    console.log(`[${this.constructor.name}] Initialized.`)
  }

  public async clearOrderBook(): Promise<void> {}

  public async placeLimitBidsAtSamePrice(n: number): Promise<void> {
    const orderBook = await OrderBook.getL2OrderBook(
      this.provider!,
      this.contract,
      this.marketParams!,
    )
    const highestBid = orderBook.bids.sort((a, b) => b[0] - a[0])[0][0]
    const lowestBid = orderBook.asks.sort((a, b) => a[0] - b[0])[0][0]
    const midPrice = new BigNumber(highestBid).plus(lowestBid).dividedBy(2)
    console.log(
      `[${this.constructor.name}] Highest Bid: ${highestBid}, Lowest Ask: ${lowestBid} Mid Price: ${midPrice.toNumber()}`,
    )

    console.log(`[${this.constructor.name}] Placing ${n} limit bids...`)
    let totalGasUsed = 0n
    for (let i = 0; i < n; i++) {
      const receipt = await GTC.placeLimit(
        this.signer!,
        this.contract,
        this.marketParams!,
        {
          price: midPrice.toFixed(3),
          size: '1',
          isBuy: true,
          postOnly: true,
        },
      )
      console.log(
        `[${this.constructor.name}] Placed limit bid ${i + 1}/${n}`,
        receipt.transactionHash,
      )
      totalGasUsed += BigInt(receipt.gasUsed.toString())
    }
    saveGasUsedResult({
      alias: `kuru-make-${n}`,
      gasUsed: new BigNumber(totalGasUsed.toString()).dividedBy(n).toFixed(0),
    })
  }

  public async takeAllOrders(n: number): Promise<void> {
    const orderBook = await OrderBook.getL2OrderBook(
      this.provider!,
      this.contract,
      this.marketParams!,
    )
    const highestDepth = orderBook.bids.sort((a, b) => b[0] - a[0])[0]

    const receipt = await IOC.placeMarket(
      this.signer!,
      this.contract,
      this.marketParams!,
      {
        approveTokens: true,
        size: highestDepth[1].toString(),
        isBuy: false,
        minAmountOut: (highestDepth[0] * highestDepth[1]).toFixed(9),
        isMargin: false,
        fillOrKill: true,
      },
    )
    saveGasUsedResult({
      alias: `kuru-take-${n}`,
      gasUsed: receipt.gasUsed.toString(),
    })
  }
}
