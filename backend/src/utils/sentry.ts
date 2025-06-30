import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import config from '../config';
import { appLogger } from './logger';

// Initialize Sentry only if DSN is provided
export const initializeSentry = (app: any) => {
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn || sentryDsn.includes('your-sentry-dsn')) {
    appLogger.info('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: config.nodeEnv,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app }),
        // Enable profiling
        new ProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
      // Profiling
      profilesSampleRate: config.nodeEnv === 'production' ? 0.1 : 1.0,
      // Release tracking
      release: process.env.npm_package_version || '1.0.0',
      // Error filtering
      beforeSend(event, hint) {
        // Filter out known non-critical errors
        const error = hint.originalException;
        
        if (error instanceof Error) {
          // Skip validation errors in production
          if (error.name === 'ValidationError' && config.nodeEnv === 'production') {
            return null;
          }
          
          // Skip rate limit errors
          if (error.message?.includes('Too many requests')) {
            return null;
          }
          
          // Skip certain HTTP errors
          if (error.message?.includes('ECONNRESET') || 
              error.message?.includes('EPIPE')) {
            return null;
          }
        }
        
        return event;
      },
      // Set user context automatically
      initialScope: {
        tags: {
          component: 'backend',
          service: 'contractguard-api',
        },
      },
    });

    appLogger.info('Sentry initialized successfully', {
      environment: config.nodeEnv,
      release: process.env.npm_package_version || '1.0.0',
    });
  } catch (error) {
    appLogger.error('Failed to initialize Sentry', error);
  }
};

// Sentry Express middleware
export const getSentryMiddleware = () => {
  if (!process.env.SENTRY_DSN || process.env.SENTRY_DSN.includes('your-sentry-dsn')) {
    return {
      requestHandler: (req: any, res: any, next: any) => next(),
      tracingHandler: (req: any, res: any, next: any) => next(),
      errorHandler: (error: any, req: any, res: any, next: any) => next(error),
    };
  }

  return {
    requestHandler: Sentry.Handlers.requestHandler(),
    tracingHandler: Sentry.Handlers.tracingHandler(),
    errorHandler: Sentry.Handlers.errorHandler({
      shouldHandleError(error) {
        // Capture 4xx and 5xx errors
        return error.status >= 400;
      },
    }),
  };
};

// Custom error reporting utilities
export class ErrorReporter {
  static captureException(error: Error, context?: any): void {
    try {
      if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('your-sentry-dsn')) {
        Sentry.captureException(error, {
          tags: {
            component: 'backend',
          },
          extra: context,
        });
      }
      
      // Always log to local logger
      appLogger.error('Exception captured', error, context);
    } catch (reportingError) {
      appLogger.error('Failed to report error to Sentry', reportingError);
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any): void {
    try {
      if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('your-sentry-dsn')) {
        Sentry.captureMessage(message, level as Sentry.SeverityLevel, {
          tags: {
            component: 'backend',
          },
          extra: context,
        });
      }
      
      // Always log to local logger
      appLogger[level === 'warning' ? 'warn' : level](message, context);
    } catch (reportingError) {
      appLogger.error('Failed to report message to Sentry', reportingError);
    }
  }

  static setUser(user: { id: string; email?: string; username?: string }): void {
    try {
      if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('your-sentry-dsn')) {
        Sentry.setUser(user);
      }
    } catch (error) {
      appLogger.error('Failed to set Sentry user context', error);
    }
  }

  static setTag(key: string, value: string): void {
    try {
      if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('your-sentry-dsn')) {
        Sentry.setTag(key, value);
      }
    } catch (error) {
      appLogger.error('Failed to set Sentry tag', error);
    }
  }

  static addBreadcrumb(message: string, category?: string, data?: any): void {
    try {
      if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('your-sentry-dsn')) {
        Sentry.addBreadcrumb({
          message,
          category: category || 'default',
          data,
          timestamp: Date.now() / 1000,
        });
      }
    } catch (error) {
      appLogger.error('Failed to add Sentry breadcrumb', error);
    }
  }

  // Performance monitoring
  static startTransaction(name: string, operation: string): any {
    try {
      if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.includes('your-sentry-dsn')) {
        return Sentry.startTransaction({ name, op: operation });
      }
      return null;
    } catch (error) {
      appLogger.error('Failed to start Sentry transaction', error);
      return null;
    }
  }
}

export default Sentry;