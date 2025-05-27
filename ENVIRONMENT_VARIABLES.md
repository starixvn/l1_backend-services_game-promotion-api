# Environment Variables

## Required Environment Variables

### Database Configuration

- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DB_NAME` - Database name

### Application Configuration

- `NODE_ENV` - Environment (development, staging, production)
- `PORT` - Application port (default: 3000)

### Sentry Configuration

- `SENTRY_DSN` - Sentry Data Source Name (required)
- `SENTRY_TRACES_SAMPLE_RATE` - Tracing sample rate (0.0 to 1.0)
- `SENTRY_RELEASE` - Release version (optional)

## Environment-specific Sentry Settings

### Development

```bash
NODE_ENV=development
SENTRY_DSN=https://401f2225fa62bd066e219a4af3a234d3@sentry-k8s.lumigame.com/19
SENTRY_TRACES_SAMPLE_RATE=1.0
```

### Staging

```bash
NODE_ENV=staging
SENTRY_DSN=https://401f2225fa62bd066e219a4af3a234d3@sentry-k8s.lumigame.com/19
SENTRY_TRACES_SAMPLE_RATE=0.5
```

### Production

```bash
NODE_ENV=production
SENTRY_DSN=https://401f2225fa62bd066e219a4af3a234d3@sentry-k8s.lumigame.com/19
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Notes

- **SENTRY_DSN**: Required for Sentry to work. Without this, Sentry will be disabled.
- **SENTRY_TRACES_SAMPLE_RATE**: Controls what percentage of transactions are sent to Sentry. Lower values in production help reduce overhead.
- **Debug mode**: Automatically enabled in development environment for better debugging.
- **Environment**: Automatically set based on NODE_ENV to help filter issues in Sentry dashboard.
