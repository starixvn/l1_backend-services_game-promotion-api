import * as Sentry from '@sentry/nestjs';

// Ensure to call this before requiring any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SYSTEM_NAME + '-' + process.env.ENV || 'DEV',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  debug: process.env.SENTRY_DEBUG === 'true',

  // Set release version if available
  release: process.env.SENTRY_RELEASE || undefined,
});
