import { HttpException } from '@nestjs/common';
import type { HTTP_STATUS } from '#app/core/error/entities/httpStatus.enum.js';

export class CustomError extends HttpException {
  constructor(message: string, statusCode: HTTP_STATUS, details?: any) {
    super(
      {
        success: false,
        message,
        statusCode,
        details,
      },
      statusCode,
    );
  }
}
