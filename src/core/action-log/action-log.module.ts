import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActionLog, ActionLogSchema } from './schemas/action-log.schema';
import { ActionLogService } from './services/action-log.service';
import { LogBuilder } from './utils/log-builder';
import { LoggerService } from '../logger/logger.service';

/**
 * Action Log Module
 * Provides structured logging capabilities for player actions
 * Logs are sent to both Sentry and MongoDB
 */
@Module({
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: ActionLog.name,
          schema: ActionLogSchema,
        },
      ],
      'logs', // Use the 'logs' connection defined in AppModule
    ),
  ],
  providers: [ActionLogService, LogBuilder, LoggerService],
  exports: [ActionLogService, LogBuilder],
})
export class ActionLogModule {}
