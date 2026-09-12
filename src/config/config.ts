import { registerAs } from '@nestjs/config';
import Joi from 'joi';
export enum NodeEnvType {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
}

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...Object.values(NodeEnvType))
    .default(NodeEnvType.DEVELOPMENT),

  API_BACKEND_PORT: Joi.number().default(4000),
  API_BACKEND_URL: Joi.string().required(),

  ALCHEMY_API_KEY: Joi.string().required(),

  RPC_PROVIDER: Joi.string().valid('public', 'alchemy', 'ankr').default('public'),
  RPC_NETWORK: Joi.string()
    .valid('ethereum-mainnet', 'ethereum-sepolia')
    .default('ethereum-sepolia'),

  ANKR_API_KEY: Joi.string().required(),
});

export default registerAs('config', () => ({
  NODE_ENV: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  apiBackendUrl: process.env.API_BACKEND_URL,
  apiBackendPort: process.env.API_BACKEND_PORT,

  rpcProvider: process.env.RPC_PROVIDER,
  rpcNetwork: process.env.RPC_NETWORK,

  apis: {
    alchemy: {
      apiKey: process.env.ALCHEMY_API_KEY,
    },
    ankr: {
      apiKey: process.env.ANKR_API_KEY,
    },
  },
}));
