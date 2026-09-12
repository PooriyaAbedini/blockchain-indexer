import { Module } from '@nestjs/common';
import { EthereumProvider } from './ethereum-provider.service.js';

@Module({
  providers: [EthereumProvider],
  exports: [EthereumProvider],
})
export class EthereumProviderModule {}
