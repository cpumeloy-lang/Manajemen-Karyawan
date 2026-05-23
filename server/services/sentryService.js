import * as Sentry from '@sentry/node';
import { loggingService } from './loggingService.js';

// Initialize Sentry if DSN is configured
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;

if (SENTRY_DSN && SENTRY_DSN !== 'your-sentry-dsn-here') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0, // 10% sampling in production
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
  loggingService.info('Sentry initialized');
} else {
  loggingService.info('Sentry not configured (SENTRY_DSN not set)');
}

export { Sentry };
