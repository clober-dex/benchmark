import { getAddress } from 'viem'
import { BigNumber } from 'bignumber.js'

import { saveGasUsedResult } from '../utils/db.ts'

import { GasEstimator } from './index.ts'

const abi = [
  {
    type: 'function',
    name: 'postFillOrder',
    inputs: [
      { name: 'account', type: 'address', internalType: 'address' },
      {
        name: 'args',
        type: 'tuple',
        internalType: 'struct ICLOB.PostFillOrderArgs',
        components: [
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
          {
            name: 'priceLimit',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'side', type: 'uint8', internalType: 'enum Side' },
          { name: 'amountIsBase', type: 'bool', internalType: 'bool' },
          {
            name: 'fillOrderType',
            type: 'uint8',
            internalType: 'enum ICLOB.FillOrderType',
          },
          {
            name: 'settlement',
            type: 'uint8',
            internalType: 'enum ICLOB.Settlement',
          },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ICLOB.PostFillOrderResult',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'orderId', type: 'uint256', internalType: 'uint256' },
          {
            name: 'quoteTokenAmountTraded',
            type: 'int256',
            internalType: 'int256',
          },
          {
            name: 'baseTokenAmountTraded',
            type: 'int256',
            internalType: 'int256',
          },
          { name: 'takerFee', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'postLimitOrder',
    inputs: [
      { name: 'account', type: 'address', internalType: 'address' },
      {
        name: 'args',
        type: 'tuple',
        internalType: 'struct ICLOB.PostLimitOrderArgs',
        components: [
          {
            name: 'amountInBase',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'price', type: 'uint256', internalType: 'uint256' },
          {
            name: 'cancelTimestamp',
            type: 'uint256',
            internalType: 'uint256',
          },
          { name: 'side', type: 'uint8', internalType: 'enum Side' },
          {
            name: 'clientOrderId',
            type: 'uint96',
            internalType: 'uint96',
          },
          {
            name: 'limitOrderType',
            type: 'uint8',
            internalType: 'enum ICLOB.LimitOrderType',
          },
          {
            name: 'settlement',
            type: 'uint8',
            internalType: 'enum ICLOB.Settlement',
          },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct ICLOB.PostLimitOrderResult',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'orderId', type: 'uint256', internalType: 'uint256' },
          {
            name: 'amountPostedInBase',
            type: 'uint256',
            internalType: 'uint256',
          },
          {
            name: 'quoteTokenAmountTraded',
            type: 'int256',
            internalType: 'int256',
          },
          {
            name: 'baseTokenAmountTraded',
            type: 'int256',
            internalType: 'int256',
          },
          { name: 'takerFee', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getTOB',
    inputs: [],
    outputs: [
      { name: 'maxBid', type: 'uint256', internalType: 'uint256' },
      { name: 'minAsk', type: 'uint256', internalType: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const

export class GteGasEstimator extends GasEstimator {
  contract = getAddress('0xD7310f8A0D569Dd0803D28BB29f4E0A471fA84F6')
  market = getAddress('0x5ca9f32d4ce7cc0f782213c446c2ae14b754a623')
  baseToken = getAddress('0x776401b9bc8aae31a685731b7147d4445fd9fb19')
  quoteToken = getAddress('0xe9b6e75c243b6100ffcb1c66e8f78f96feea727f')

  public async clearOrderbook(): Promise<void> {
    // eth transfer to baseToken for deposit
    await this.walletClient
      .sendTransaction({
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        to: this.baseToken as `0x${string}`,
        value: 20000000n * 10n ** 18n,
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    await this.walletClient
      .writeContract({
        address: this.market,
        account: this.walletClient.account!,
        chain: this.publicClient.chain!,
        abi,
        functionName: 'postFillOrder',
        gas: 16_000_000n,
        args: [
          this.walletClient.account!.address,
          {
            amount: 10000000n * 10n ** 18n,
            priceLimit: 0n, // No price limit
            side: 1, // 0 for buy, 1 for sell
            amountIsBase: true,
            fillOrderType: 0,
            settlement: 0,
          },
        ],
      })
      .then((hash) =>
        this.publicClient.waitForTransactionReceipt({
          hash,
        }),
      )
  }

  public async placeLimitBidsAtSamePrice(n: number): Promise<void> {
    await this.walletClient
      .sendTransaction({
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        to: this.baseToken as `0x${string}`,
        value: 10000n * 10n ** 18n,
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [highestBid, _] = await this.publicClient.readContract({
      address: this.market,
      abi,
      functionName: 'getTOB',
    })
    const midPrice = highestBid + 10n ** 15n
    let totalGasUsed = 0n
    for (let i = 0; i < n; i++) {
      await this.walletClient
        .writeContract({
          address: this.market,
          abi,
          account: this.walletClient.account!,
          chain: this.publicClient.chain!,
          functionName: 'postLimitOrder',
          args: [
            this.walletClient.account!.address,
            {
              amountInBase: 100000000n,
              price: midPrice,
              cancelTimestamp: 0n,
              side: 0,
              clientOrderId: 0n,
              limitOrderType: 1,
              settlement: 0,
            },
          ],
        })
        .then(async (hash) => {
          const receipt = await this.publicClient.waitForTransactionReceipt({
            hash,
          })
          if (receipt.status !== 'success') {
            throw new Error(`Transaction failed: ${receipt.transactionHash}`)
          }

          console.log(
            `[${this.constructor.name}] Placed limit bid ${i + 1}/${n}`,
            receipt.transactionHash,
          )
          totalGasUsed += receipt.gasUsed

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [highestBid, _] = await this.publicClient.readContract({
            address: this.market,
            abi,
            functionName: 'getTOB',
          })
          if (highestBid !== midPrice) {
            throw new Error(
              `[Place Limit Bids] Expected highestBid to be ${midPrice}, but got ${highestBid}`,
            )
          }
        })
    }
    saveGasUsedResult({
      alias: `gte-make-${n}`,
      gasUsed: new BigNumber(totalGasUsed.toString()).dividedBy(n).toFixed(0),
    })
  }

  public async takeAllOrders(n: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [beforeHighestBid, _] = await this.publicClient.readContract({
      address: this.market,
      abi,
      functionName: 'getTOB',
    })

    await this.walletClient
      .writeContract({
        address: this.market,
        account: this.walletClient.account!,
        chain: this.publicClient.chain!,
        abi,
        functionName: 'postFillOrder',
        gas: 8_000_000n,
        args: [
          this.walletClient.account!.address,
          {
            amount: 10n ** 18n,
            priceLimit: beforeHighestBid,
            side: 1, // 0 for buy, 1 for sell
            amountIsBase: true,
            fillOrderType: 1,
            settlement: 0,
          },
        ],
      })
      .then(async (hash) => {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
        })
        const [afterHighestBid, _] = await this.publicClient.readContract({
          address: this.market,
          abi,
          functionName: 'getTOB',
        })

        if (receipt.status !== 'success') {
          throw new Error(`Transaction failed: ${receipt.transactionHash}`)
        }
        if (afterHighestBid === beforeHighestBid) {
          throw new Error(
            `[Take All Orders] Expected afterHighestBid to be different from beforeHighestBid, but got ${afterHighestBid}`,
          )
        }
        saveGasUsedResult({
          alias: `gte-take-${n}`,
          gasUsed: receipt.gasUsed.toString(),
        })
      })
  }
}
