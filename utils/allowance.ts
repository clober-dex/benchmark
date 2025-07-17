import { erc20Abi, type WalletClient } from 'viem'

export const maxApproveToken = async ({
  tokenAddress,
  spender,
  walletClient,
}: {
  tokenAddress: `0x${string}`
  spender: `0x${string}`
  walletClient: WalletClient
}): Promise<`0x${string}`> => {
  return walletClient.writeContract({
    account: walletClient.account!,
    chain: walletClient.chain!,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spender, 2n ** 256n - 1n],
  })
}
