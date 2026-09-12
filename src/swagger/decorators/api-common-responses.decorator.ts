import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto.js';

/** Standard error responses applied to every documented endpoint. */
export function ApiCommonResponses() {
  return applyDecorators(
    ApiBadRequestResponse({
      description: 'Validation failed or invalid request parameters',
      type: ErrorResponseDto,
    }),
    ApiInternalServerErrorResponse({
      description: 'Unexpected server error',
      type: ErrorResponseDto,
    }),
  );
}
