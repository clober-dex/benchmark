import { type Chain, monadTestnet } from 'viem/chains'
import { getAddress } from 'viem'

export const ARCHIVE_RPC_URL =
  'https://proud-tiniest-flower.monad-testnet.quiknode.pro/a4ebe00fca2e7bf01201f3b0f7fe2f0077c52a36'
export const FORK_BLOCK_NUMBER = 26608965
export const PORT = 8545
export const WHALE_WALLET = getAddress(
  '0xFA735CcA8424e4eF30980653bf9015331d9929dB',
)

export const FORKED_CHAIN: Chain = {
  ...monadTestnet,
  rpcUrls: {
    default: {
      http: [`http://127.0.0.1:${PORT}`],
    },
    public: {
      http: [`http://127.0.0.1:${PORT}`],
    },
  },
}
