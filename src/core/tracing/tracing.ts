import * as dotenv from 'dotenv';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { MongooseInstrumentation } from '@opentelemetry/instrumentation-mongoose';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

export function initializeTracing(): void {
  const enableOTEL = process.env.OTEL_ENABLED ?? false;
  if (!enableOTEL) return;

  dotenv.config();

  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  });

  const sdk = new NodeSDK({
    traceExporter: otlpExporter,
    serviceName: process.env.APP_NAME,
    instrumentations: [
      new NestInstrumentation(),
      new MongooseInstrumentation(),
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  // Start the SDK
  sdk.start();

  console.log('OpenTelemetry tracing initialized successfully');
}
