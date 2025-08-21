// Initialize OpenTelemetry tracing BEFORE importing any other modules
import { initializeTracing } from './core/tracing/tracing';
initializeTracing();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { LoggerService } from './core/logger/logger.service';
import { AppModule } from './app.module';
import * as Sentry from '@sentry/nestjs';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('Game Promotion API')
    .setDescription('API for managing game promotions in minigame database')
    .setVersion('1.0')
    .addTag('health-check', 'Health check endpoints')
    .addTag('promotions', 'Game promotion management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: `${process.env.SYSTEM_NAME}-${process.env.ENV}` || 'DEV',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    debug: true,
    release: '1.0.0',
  });

  // Enable CORS
  app.enableCors();

  const port = process.env.PORT || 5000;
  await app.listen(port);
  const loggerService = app.get(LoggerService);
  loggerService.captureMessage(
    `Application started on port ${port} at ${new Date().toISOString()}`,
  );

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api`);
}

bootstrap();
