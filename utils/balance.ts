import type { PublicClient } from 'viem'
import { erc20Abi, getAddress, isAddressEqual, zeroAddress } from 'viem'

import { FORKED_CHAIN } from '../constants.ts'

export const getTokenBalanceMap = async ({
  publicClient,
  tokenAddresses,
  userAddress,
}: {
  publicClient: PublicClient
  tokenAddresses: `0x${string}`[]
  userAddress: `0x${string}`
}) => {
  const uniqueTokenAddresses = tokenAddresses.filter(
    (address, index, self) =>
      address !== zeroAddress && isAddressEqual(address, self[index]),
  )
  const [results, balance] = await Promise.all([
    publicClient.multicall({
      contracts: uniqueTokenAddresses.map((address) => ({
        chainId: FORKED_CHAIN.id,
        address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress],
      })),
    }),
    publicClient.getBalance({
      address: userAddress,
    }),
  ])
  return results.reduce(
    (acc: {}, { result }, index: number) => {
      const address = uniqueTokenAddresses[index]
      return {
        ...acc,
        [getAddress(address)]: result ?? 0n,
        [address.toLowerCase()]: result ?? 0n,
      }
    },
    {
      [zeroAddress]: balance ?? 0n,
    },
  )
}
