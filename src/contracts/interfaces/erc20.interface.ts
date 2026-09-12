import { Interface } from 'ethers';

export const ERC20Interface = new Interface([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);
