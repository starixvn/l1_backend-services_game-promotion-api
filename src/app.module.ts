import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER } from '@nestjs/core';
import { SentryModule } from '@sentry/nestjs/setup';
import { PromotionModule } from './promotion/promotion.module';
import { PromotionTicketModule } from './promotion-ticket/promotion-ticket.module';
import { CoreModule } from './core/core.module';
import { PromotionAnnouncementModule } from './announcement/promotion-announcement.module';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { LoggerService } from './core/logger/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SentryModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        const dbName = configService.get<string>('MONGODB_DB_NAME');

        return {
          uri,
          ...(dbName && { dbName }),
        };
      },
    }),
    PromotionModule,
    PromotionTicketModule,
    PromotionAnnouncementModule,
    CoreModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useFactory: (loggerService: LoggerService) => new AllExceptionsFilter(loggerService),
      inject: [LoggerService],
    },
  ],
})
export class AppModule {}
