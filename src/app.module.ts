import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { PromotionModule } from './promotion/promotion.module';
import { CoreModule } from './core/core.module';
import { PromotionAnnouncementModule } from './announcement/promotion-announcement.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    PromotionAnnouncementModule,
    CoreModule,
  ],
})
export class AppModule {}
