import { Module } from '@nestjs/common';
import { HealthCheckController } from './health-check/health-check.controller';
import { LoggerService } from './logger/logger.service';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Module({
  controllers: [HealthCheckController],
  providers: [LoggerService, AllExceptionsFilter],
  exports: [LoggerService],
})
export class CoreModule {}
