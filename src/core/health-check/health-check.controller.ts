import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggerService } from '../logger/logger.service';

@ApiTags('health-check')
@Controller()
export class HealthCheckController {
  constructor(private readonly loggerService: LoggerService) {}
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
    // Add some context before throwing the error
    this.loggerService.setTags({
      test: 'true',
      endpoint: 'debug-sentry',
    });

    this.loggerService.addBreadcrumb('Debug endpoint called', 'debug', 'info', {
      timestamp: new Date().toISOString(),
    });

    // Manually capture a message first
    this.loggerService.captureMessage(
      'Debug endpoint accessed - about to throw test error',
      'info',
      { endpoint: '/debug-sentry' },
    );

    throw new Error('Test Sentry error - this should be captured by Sentry!');
  }
}
