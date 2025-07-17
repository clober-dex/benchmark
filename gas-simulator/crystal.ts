import { getAddress, parseUnits } from 'viem'
import { BigNumber } from 'bignumber.js'

import { saveGasUsedResult } from '../utils/db.ts'

import { GasEstimator } from './index.ts'

const abi = [
  // function limitOrder(bool isBuy, uint256 price, uint256 size, address from, address owner) external returns (uint256 id)
  {
    type: 'function',
    name: 'limitOrder',
    inputs: [
      { name: 'isBuy', type: 'bool', internalType: 'bool' },
      { name: 'price', type: 'uint256', internalType: 'uint256' },
      { name: 'size', type: 'uint256', internalType: 'uint256' },
      { name: 'from', type: 'address', internalType: 'address' },
      { name: 'owner', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: 'id', type: 'uint256', internalType: 'uint256' }],
  },
  // function marketOrder(bool isBuy, bool isExactInput, bool isFromCaller, bool isToCaller, uint256 orderType, uint256 size, uint256 worstPrice, address caller, address referrer) external returns (uint256 amountIn, uint256 amountOut, uint256 id)
  {
    type: 'function',
    name: 'marketOrder',
    inputs: [
      { name: 'isBuy', type: 'bool', internalType: 'bool' },
      { name: 'isExactInput', type: 'bool', internalType: 'bool' },
      { name: 'isFromCaller', type: 'bool', internalType: 'bool' },
      { name: 'isToCaller', type: 'bool', internalType: 'bool' },
      { name: 'orderType', type: 'uint256', internalType: 'uint256' },
      { name: 'size', type: 'uint256', internalType: 'uint256' },
      { name: 'worstPrice', type: 'uint256', internalType: 'uint256' },
      { name: 'caller', type: 'address', internalType: 'address' },
      { name: 'referrer', type: 'address', internalType: 'address' },
    ],
  },
  // function lowestAsk() external view returns (uint256 lowestAsk)
  {
    type: 'function',
    name: 'lowestAsk',
    inputs: [],
    outputs: [{ name: 'lowestAsk', type: 'uint256', internalType: 'uint256' }],
  },
  // function highestBid() external view returns (uint256 highestBid)
  {
    type: 'function',
    name: 'highestBid',
    inputs: [],
    outputs: [{ name: 'highestBid', type: 'uint256', internalType: 'uint256' }],
  },
  // function registerUser(address caller) external returns (uint256 _latestUserId)
  {
    type: 'function',
    name: 'registerUser',
    inputs: [{ name: 'caller', type: 'address', internalType: 'address' }],
    outputs: [
      { name: '_latestUserId', type: 'uint256', internalType: 'uint256' },
    ],
  },
] as const

export class CrystalGasEstimator extends GasEstimator {
  contract = getAddress('0xCF16582dC82c4C17fA5b54966ee67b74FD715fB5')
  baseToken = getAddress('0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D')
  quoteToken = getAddress('0xf817257fed379853cDe0fa4F97AB987181B1E5Ea')

  public async clearOrderBook(): Promise<void> {
    await this.walletClient
      .writeContract({
        address: this.contract,
        account: this.walletClient.account!,
        chain: this.publicClient.chain!,
        abi,
        functionName: 'marketOrder',
        gas: 10_000_000n, // Set a high gas limit to ensure the transaction goes through
        args: [
          false, // isBuy
          true, // isExactInput
          false, // isFromCaller
          false, // isToCaller
          2n, // orderType
          parseUnits('1000000', 6), // size
          0n, // worstPrice
          this.walletClient.account!.address, // caller
          this.walletClient.account!.address, // owner
        ],
      })
      .then(async (hash) =>
        this.publicClient.waitForTransactionReceipt({ hash }),
      )

    await this.walletClient
      .writeContract({
        address: this.contract,
        account: this.walletClient.account!,
        chain: this.publicClient.chain!,
        abi,
        functionName: 'marketOrder',
        gas: 10_000_000n, // Set a high gas limit to ensure the transaction goes through
        args: [
          true, // isBuy
          true, // isExactInput
          false, // isFromCaller
          false, // isToCaller
          2n, // orderType
          parseUnits('1000000', 6), // size
          2n ** 256n - 1n, // worstPrice
          this.walletClient.account!.address, // caller
          this.walletClient.account!.address, // owner
        ],
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    const [{ result: highestBid }, { result: lowestAsk }] =
      (await this.publicClient.multicall({
        contracts: [
          {
            address: this.contract,
            abi,
            functionName: 'highestBid',
          },
          {
            address: this.contract,
            abi,
            functionName: 'lowestAsk',
          },
        ],
      })) as { result: bigint }[]

    if (highestBid !== 0n || lowestAsk !== 10000n) {
      throw new Error(
        `Order book not cleared. Highest Bid: ${highestBid}, Lowest Ask: ${lowestAsk}`,
      )
    }
    console.log(`[${this.constructor.name}] Order book cleared.`)
  }

  public async placeLimitBidsAtSamePrice(n: number): Promise<void> {
    await this.walletClient
      .writeContract({
        address: this.contract,
        abi,
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        functionName: 'registerUser',
        args: [this.walletClient.account!.address],
      })
      .then((hash) => this.publicClient.waitForTransactionReceipt({ hash }))

    console.log(`[${this.constructor.name}] Placing ${n} limit bids...`)
    let totalGasUsed = 0n
    for (let i = 0; i < n; i++) {
      await this.walletClient
        .writeContract({
          address: this.contract,
          abi,
          chain: this.publicClient.chain!,
          account: this.walletClient.account!,
          functionName: 'limitOrder',
          args: [
            true,
            1000n,
            '1050000',
            this.walletClient.account!.address,
            this.walletClient.account!.address,
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
        })
    }
    saveGasUsedResult({
      alias: `crystal-make-${n}`,
      gasUsed: new BigNumber(totalGasUsed.toString()).dividedBy(n).toFixed(0),
    })
  }

  public async takeAllOrders(n: number): Promise<void> {
    await this.walletClient
      .writeContract({
        address: this.contract,
        abi,
        chain: this.publicClient.chain!,
        account: this.walletClient.account!,
        functionName: 'marketOrder',
        args: [
          false,
          true,
          false,
          false,
          2n,
          parseUnits('1000000', 6),
          0n, // worstPrice
          this.walletClient.account!.address,
          this.walletClient.account!.address,
        ],
      })
      .then(async (hash) => {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash,
        })
        if (receipt.status !== 'success') {
          throw new Error(`Transaction failed: ${receipt.transactionHash}`)
        }
        saveGasUsedResult({
          alias: `crystal-take-${n}`,
          gasUsed: receipt.gasUsed.toString(),
        })
      })
  }
}
