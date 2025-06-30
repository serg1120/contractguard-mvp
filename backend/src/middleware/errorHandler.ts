import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errorCode?: string;
  details?: any;

  constructor(message: string, statusCode: number, errorCode?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 422, 'FILE_PROCESSING_ERROR', details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error') {
    super(`${service}: ${message}`, 503, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'An unexpected error occurred. Please try again later.';
  let errorCode = 'INTERNAL_ERROR';
  let details: any = undefined;

  // Handle known application errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode || 'APP_ERROR';
    details = err.details;
  } 
  // Handle database errors
  else if (err.message?.includes('duplicate key')) {
    statusCode = 409;
    message = 'This resource already exists';
    errorCode = 'DUPLICATE_RESOURCE';
  }
  else if (err.message?.includes('foreign key')) {
    statusCode = 400;
    message = 'Invalid reference to related resource';
    errorCode = 'INVALID_REFERENCE';
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errorCode = 'INVALID_TOKEN';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    errorCode = 'TOKEN_EXPIRED';
  }
  // Handle validation errors from express-validator
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  }
  // Handle multer errors
  else if (err.message?.includes('LIMIT_FILE_SIZE')) {
    statusCode = 413;
    message = 'File size exceeds the maximum limit of 10MB';
    errorCode = 'FILE_TOO_LARGE';
  }
  else if (err.message?.includes('LIMIT_UNEXPECTED_FILE')) {
    statusCode = 400;
    message = 'Unexpected file field or too many files';
    errorCode = 'INVALID_FILE_UPLOAD';
  }
  // Handle syntax errors (malformed JSON)
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON format in request body';
    errorCode = 'INVALID_JSON';
  }
  // Handle network/connection errors
  else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'External service temporarily unavailable';
    errorCode = 'SERVICE_UNAVAILABLE';
  }
  else if (err.code === 'ETIMEDOUT') {
    statusCode = 504;
    message = 'Request timeout - please try again';
    errorCode = 'TIMEOUT';
  }
  // Handle OpenAI API errors
  else if (err.message?.includes('OpenAI')) {
    statusCode = 503;
    message = 'Analysis service temporarily unavailable. Please try again later.';
    errorCode = 'ANALYSIS_SERVICE_ERROR';
  }

  // Log error details for debugging (but not sensitive information)
  const logError = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    errorMessage: err.message,
    errorName: err.name,
    errorCode,
    statusCode,
    ...(err instanceof AppError && { isOperational: err.isOperational }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Log based on severity
  if (statusCode >= 500) {
    console.error('Server Error:', logError);
  } else if (statusCode >= 400) {
    console.warn('Client Error:', logError);
  }

  // Prepare response
  const errorResponse: any = {
    success: false,
    error: {
      message,
      code: errorCode,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  };

  // Add details if available (but sanitize sensitive information)
  if (details && process.env.NODE_ENV !== 'production') {
    errorResponse.error.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // Add request ID if available
  const requestId = req.headers['x-request-id'] || res.getHeader('x-request-id');
  if (requestId) {
    errorResponse.error.requestId = requestId;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handle async route errors
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.method} ${req.path}`);
  next(error);
};