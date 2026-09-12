import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiCommonResponses } from '#app/swagger/decorators/api-common-responses.decorator.js';
import {
  GetETHTransferLogsRequestDto,
  GetETHTransferLogsResponseDto,
  ParsedTransferLogDto,
} from './dtos/get-eth-transfer-logs.dto.js';
import {
  type GetETHBlocksByNumberRequestDto,
  GetETHBlocksByNumberResponseDto,
} from './dtos/get-eth-blocks-by-number.js';
import {
  type GetETHTokenMetadataRequestDto,
  GetETHTokenMetadataResponseDto,
} from './dtos/get-eth-token-metadata.js';
import {
  type TestHistoricalAutomationRequestDto,
  TestHistoricalAutomationResponseDto,
} from './dtos/historical-automation-test.dto.js';
import { serviceTokens } from '#app/core/service/service-tokens.js';
import type { ServiceRegistry } from '#app/core/service/service-registry.js';

@ApiTags('indexer')
@ApiExtraModels(
  GetETHTransferLogsRequestDto,
  GetETHTransferLogsResponseDto,
  ParsedTransferLogDto,
)
@Controller('indexer')
export class IndexerController {
  constructor(
    @Inject(serviceTokens.SERVICE_REGISTRY)
    private readonly service: ServiceRegistry,
  ) {}

  @Get('eth-transfer-logs')
  @ApiOperation({
    summary: 'Get ETH Transfer event logs',
    description:
      'Fetches and decodes ERC-20/ERC-721 Transfer events for the given inclusive block range. Optionally filter by contract address.',
  })
  @ApiOkResponse({
    description: 'Parsed Transfer logs for the requested block range',
    type: GetETHTransferLogsResponseDto,
  })
  @ApiCommonResponses()
  async getETHTransferLogs(
    @Query() query: GetETHTransferLogsRequestDto,
  ): Promise<GetETHTransferLogsResponseDto> {
    return await this.service.indexerService.getETHTransferLogs(query);
  }

  @Get('eth-blocks-by-number')
  @ApiOperation({
    summary: 'Get ETH blocks',
    description:
      'Fetches and decodes ethereum blocks for the given inclusive block range. Optionally add block transactions to it.',
  })
  @ApiOkResponse({
    description: 'Blocks for the requested block range',
    type: GetETHBlocksByNumberResponseDto,
    isArray: true,
  })
  async getETHBlocksByNumber(
    @Query() query: GetETHBlocksByNumberRequestDto,
  ): Promise<GetETHBlocksByNumberResponseDto[]> {
    return await this.service.indexerService.getETHBlocksByNumber(query);
  }

  @ApiOkResponse({
    description: 'Token metadata',
    type: [GetETHTokenMetadataResponseDto],
  })
  @Get('eth-token-metadata')
  async getMetadata(
    @Query() query: GetETHTokenMetadataRequestDto,
  ): Promise<GetETHTokenMetadataResponseDto[]> {
    return this.service.indexerService.getETHTokensMetadata(query);
  }

  @Get('test-historical-automation')
  @ApiOperation({
    summary: 'Test the indexer historical automation',
    description:
      'Fetches blocks, txns, receipts, logs and token metadata and saves them in db',
  })
  @ApiOkResponse({
    description: 'Blocks we processed',
    type: TestHistoricalAutomationResponseDto,
    isArray: true,
  })
  @ApiCommonResponses()
  async testHistoricalAutomation(
    @Query() query: TestHistoricalAutomationRequestDto,
  ): Promise<TestHistoricalAutomationResponseDto[]> {
    return await this.service.indexerService.testHistoricalAutomation(query);
  }
}
