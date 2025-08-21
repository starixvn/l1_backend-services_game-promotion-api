import { Module } from '@nestjs/common';
import { HealthCheckController } from './health-check/health-check.controller';
import { LoggerService } from './logger/logger.service';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TracingService } from './tracing/tracing.service';

@Module({
  controllers: [HealthCheckController],
  providers: [LoggerService, AllExceptionsFilter, TracingService],
  exports: [LoggerService, TracingService],
})
export class CoreModule {}
