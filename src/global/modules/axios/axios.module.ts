import { Module } from '@nestjs/common';
import { AxiosService } from './axios.service.js';

@Module({
  providers: [AxiosService],
})
export class AxiosModule {}
