export enum ProviderName {
  ALCHEMY = 'alchemy',
  PUBLIC = 'public',
  ANKR = 'ankr',
}

export enum NetworkName {
  ETHEREUM_MAINNET = 'ethereum-mainnet',
  ETHEREUM_SEPOLIA = 'ethereum-sepolia',
}

export const BASE_URLS = {
  alchemy: {
    ethereum: {
      http: {
        mainnet: (apiKey: string) =>
          `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
        sepolia: (apiKey: string) =>
          `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
      },
      ws: {
        mainnet: (apiKey: string) => `wss://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
        sepolia: (apiKey: string) => `wss://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
      },
    },
  },

  ankr: {
    ethereum: {
      http: {
        mainnet: (apiKey: string) => `https://rpc.ankr.com/eth/${apiKey}`,
        sepolia: (apiKey: string) => `https://rpc.ankr.com/eth_sepolia/${apiKey}`,
      },
      ws: {},
    },
  },

  public: {
    ethereum: {
      http: {
        mainnet: 'https://ethereum-rpc.publicnode.com',
        sepolia: 'https://ethereum-sepolia-rpc.publicnode.com',
      },
      ws: {},
    },
  },
} as const;
