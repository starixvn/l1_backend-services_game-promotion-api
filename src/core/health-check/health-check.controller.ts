import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health-check')
@Controller()
export class HealthCheckController {
  /**
   * Root endpoint for health check
   * @returns Health status of the API
   */
  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-04-22T08:00:00.000Z' },
        message: { type: 'string', example: 'Game Promotion API is healthy' },
      },
    },
  })
  healthCheck(): { status: string; timestamp: string; message: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Game Promotion API is healthy',
    };
  }

  /**
   * Test endpoint to verify Sentry error tracking
   * @returns Throws an error to test Sentry integration
   */
  @Get('debug-sentry')
  @ApiOperation({ summary: 'Test Sentry error tracking' })
  @ApiResponse({
    status: 500,
    description: 'Throws an error to test Sentry integration',
  })
  testSentry(): never {
    throw new Error('Test Sentry error - this should be captured by Sentry!');
  }
}
