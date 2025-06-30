import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// Initialize Sentry for error tracking
export const initializeErrorTracking = (): void => {
  const sentryDsn = process.env.REACT_APP_SENTRY_DSN;
  const enableErrorTracking = process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true';
  
  if (!enableErrorTracking || !sentryDsn || sentryDsn.includes('your-sentry-dsn')) {
    console.log('Error tracking not configured or disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.REACT_APP_ENVIRONMENT || 'development',
      integrations: [
        new BrowserTracing({
          // Set sampling rate for performance monitoring
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            React.useEffect,
            useLocation as any,
            useNavigationType as any,
            createMatchPath as any
          ),
        }),
      ],
      // Performance monitoring
      tracesSampleRate: process.env.REACT_APP_ENVIRONMENT === 'production' ? 0.1 : 1.0,
      // Release tracking
      release: process.env.REACT_APP_VERSION || '1.0.0',
      // Error filtering
      beforeSend(event, hint) {
        // Filter out known non-critical errors
        const error = hint.originalException;
        
        if (error instanceof Error) {
          // Skip network errors in production
          if (error.name === 'NetworkError' && process.env.REACT_APP_ENVIRONMENT === 'production') {
            return null;
          }
          
          // Skip ChunkLoadError (common in React apps)
          if (error.name === 'ChunkLoadError') {
            return null;
          }
          
          // Skip ResizeObserver errors (common browser issue)
          if (error.message?.includes('ResizeObserver loop limit exceeded')) {
            return null;
          }
        }
        
        return event;
      },
      // Set initial scope
      initialScope: {
        tags: {
          component: 'frontend',
          service: 'contractguard-ui',
        },
      },
    });

    console.log('Error tracking initialized successfully');
  } catch (error) {
    console.error('Failed to initialize error tracking:', error);
  }
};

// Custom error reporting utilities
export class ErrorReporter {
  static captureException(error: Error, context?: any): void {
    try {
      if (process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true') {
        Sentry.captureException(error, {
          tags: {
            component: 'frontend',
          },
          extra: context,
        });
      }
      
      // Always log to console in development
      if (process.env.REACT_APP_ENVIRONMENT === 'development') {
        console.error('Exception captured:', error, context);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: any): void {
    try {
      if (process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true') {
        Sentry.captureMessage(message, level as Sentry.SeverityLevel, {
          tags: {
            component: 'frontend',
          },
          extra: context,
        });
      }
      
      // Always log to console in development
      if (process.env.REACT_APP_ENVIRONMENT === 'development') {
        console[level === 'warning' ? 'warn' : level](message, context);
      }
    } catch (reportingError) {
      console.error('Failed to report message:', reportingError);
    }
  }

  static setUser(user: { id: string; email?: string; username?: string }): void {
    try {
      if (process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true') {
        Sentry.setUser(user);
      }
    } catch (error) {
      console.error('Failed to set user context:', error);
    }
  }

  static setTag(key: string, value: string): void {
    try {
      if (process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true') {
        Sentry.setTag(key, value);
      }
    } catch (error) {
      console.error('Failed to set tag:', error);
    }
  }

  static addBreadcrumb(message: string, category?: string, data?: any): void {
    try {
      if (process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true') {
        Sentry.addBreadcrumb({
          message,
          category: category || 'default',
          data,
          timestamp: Date.now() / 1000,
        });
      }
    } catch (error) {
      console.error('Failed to add breadcrumb:', error);
    }
  }

  // Performance monitoring
  static startTransaction(name: string, operation: string): any {
    try {
      if (process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true') {
        return Sentry.startTransaction({ name, op: operation });
      }
      return null;
    } catch (error) {
      console.error('Failed to start transaction:', error);
      return null;
    }
  }
}

// React Error Boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

import React, { useEffect } from 'react';
import { useLocation, useNavigationType, createMatchPath } from 'react-router-dom';

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorReporter.captureException(error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="error-boundary">
          <div className="container mt-5">
            <div className="row justify-content-center">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body text-center">
                    <h5 className="card-title text-danger">Something went wrong</h5>
                    <p className="card-text">
                      We've encountered an unexpected error. Our team has been notified.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={this.resetError}
                    >
                      Try Again
                    </button>
                    <button
                      className="btn btn-link"
                      onClick={() => window.location.href = '/'}
                    >
                      Go Home
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for Sentry profiling
export const withSentryProfiling = <P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.ComponentType<P> => {
  return Sentry.withProfiler(Component, { name: name || Component.displayName || Component.name });
};

export default Sentry;