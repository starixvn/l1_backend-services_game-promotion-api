# Environment Variables Configuration

This document describes all the environment variables used by the Game Promotion API.

## Application Configuration

```bash
# Server port
PORT=5000

# Environment (development, staging, production)
ENV=development

# System name for logging and monitoring
SYSTEM_NAME=game-promotion-api
```

## Database Configuration

```bash
# MongoDB connection string
MONGODB_URI=mongodb://localhost:27017/game-promotion
```

## Monitoring and Observability

### Sentry Error Tracking

```bash
# Sentry DSN for error tracking
SENTRY_DSN=your_sentry_dsn_here

# Sentry traces sample rate (0.0 to 1.0)
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### OpenTelemetry Distributed Tracing

#### Service Identification

```bash
# Service name for tracing
OTEL_SERVICE_NAME=game-promotion-api

# Service version
OTEL_SERVICE_VERSION=1.0.0
```

#### OTLP Exporter Configuration

```bash
# OTLP endpoint for traces (works with Jaeger 1.35+ and other OTLP-compatible backends)
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces

# Alternative: Jaeger's legacy endpoint (deprecated, use OTLP instead)
# JAEGER_ENDPOINT=http://localhost:14268/api/traces
```

#### Instrumentation Controls

Set any of these to `false` to disable specific instrumentations:

```bash
# NestJS core instrumentation
OTEL_NESTJS_ENABLED=true

# MongoDB/Mongoose instrumentation
OTEL_MONGODB_ENABLED=true

# HTTP instrumentation for outgoing requests
OTEL_HTTP_ENABLED=true

# Express instrumentation for incoming requests
OTEL_EXPRESS_ENABLED=true
```

#### Sampling Configuration

```bash
# Trace sampling strategy
OTEL_TRACES_SAMPLER=traceidratio

# Sample rate for traces (0.0 to 1.0)
OTEL_TRACES_SAMPLER_ARG=0.1

# Resource attributes (comma-separated key=value pairs)
OTEL_RESOURCE_ATTRIBUTES=service.name=game-promotion-api,service.version=1.0.0
```

## Example .env File

Create a `.env` file in the project root with the following content:

```bash
# Application
PORT=5000
ENV=development
SYSTEM_NAME=game-promotion-api

# Database
MONGODB_URI=mongodb://localhost:27017/game-promotion

# Sentry
SENTRY_DSN=your_sentry_dsn_here
SENTRY_TRACES_SAMPLE_RATE=0.1

# OpenTelemetry
OTEL_SERVICE_NAME=game-promotion-api
OTEL_SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTEL_NESTJS_ENABLED=true
OTEL_MONGODB_ENABLED=true
OTEL_HTTP_ENABLED=true
OTEL_EXPRESS_ENABLED=true
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

## Running Jaeger Locally with OTLP Support

To run Jaeger locally with OTLP support using Docker:

```bash
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 4317:4317 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest
```

Port mapping:

- `16686`: Jaeger UI
- `14268`: Jaeger legacy HTTP collector (deprecated)
- `4317`: OTLP gRPC receiver
- `4318`: OTLP HTTP receiver (recommended)

Then access the Jaeger UI at: http://localhost:16686
