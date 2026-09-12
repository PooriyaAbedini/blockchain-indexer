export interface ChainConfig {
  chainId: number;
  name: string;
  slug: string;
  nativeCurrency: string;
}

export const chains = {
  'ethereum-mainnet': {
    mainnet: {
      chainId: 1,
      name: 'Ethereum',
      slug: 'ethereum-mainnet',
      nativeCurrency: 'ETH',
    },

    'ethereum-sepolia': {
      chainId: 11155111,
      name: 'Ethereum Sepolia',
      slug: 'ethereum-sepolia',
      nativeCurrency: 'ETH',
    },
  },

  // polygon: {
  //   mainnet: {
  //     chainId: 137,
  //     name: 'Polygon',
  //     slug: 'polygon-mainnet',
  //     nativeCurrency: 'POL',
  //   },
  // },

  // arbitrum: {
  //   mainnet: {
  //     chainId: 42161,
  //     name: 'Arbitrum One',
  //     slug: 'arbitrum-one',
  //     nativeCurrency: 'ETH',
  //   },
  // },

  // base: {
  //   mainnet: {
  //     chainId: 8453,
  //     name: 'Base',
  //     slug: 'base-mainnet',
  //     nativeCurrency: 'ETH',
  //   },
  // },
} as const;

export const validChainIds = Object.values(chains)
  .flatMap((network) => Object.values(network))
  .map((chain) => chain.chainId);

export type ChainId = (typeof validChainIds)[number];

export const chainById: Record<number, ChainConfig> = Object.values(chains)
  .flatMap((network) => Object.values(network))
  .reduce<Record<number, ChainConfig>>((acc, chain) => {
    acc[chain.chainId] = chain;
    return acc;
  }, {});
