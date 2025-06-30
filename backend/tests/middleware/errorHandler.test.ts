import { Request, Response, NextFunction } from 'express';
import { 
  errorHandler, 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  ConflictError
} from '../../src/middleware/errorHandler';

describe('ErrorHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    
    mockReq = {
      method: 'GET',
      url: '/test',
      path: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      headers: {}
    };
    
    mockRes = {
      status: statusSpy,
      getHeader: jest.fn(),
      json: jsonSpy
    };
    
    mockNext = jest.fn();
  });

  describe('Error Classes', () => {
    it('should create AppError correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { detail: 'test' });
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.isOperational).toBe(true);
    });

    it('should create ValidationError correctly', () => {
      const error = new ValidationError('Validation failed', { field: 'email' });
      
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: 'email' });
    });

    it('should create AuthenticationError correctly', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('AUTHENTICATION_ERROR');
    });

    it('should create NotFoundError correctly', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('NOT_FOUND');
    });

    it('should create ConflictError correctly', () => {
      const error = new ConflictError('Resource already exists');
      
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT_ERROR');
    });
  });

  describe('errorHandler', () => {
    beforeEach(() => {
      // Set development environment for tests
      process.env.NODE_ENV = 'test';
    });

    it('should handle AppError correctly', () => {
      const error = new AppError('Custom error', 422, 'CUSTOM_ERROR');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(422);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Custom error',
            code: 'CUSTOM_ERROR',
            statusCode: 422
          })
        })
      );
    });

    it('should handle database duplicate key errors', () => {
      const error = new Error('duplicate key value violates unique constraint');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(409);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'This resource already exists',
            code: 'DUPLICATE_RESOURCE'
          })
        })
      );
    });

    it('should handle JWT errors', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Invalid authentication token',
            code: 'INVALID_TOKEN'
          })
        })
      );
    });

    it('should handle file size limit errors', () => {
      const error = new Error('LIMIT_FILE_SIZE: File too large');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(413);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'File size exceeds the maximum limit of 10MB',
            code: 'FILE_TOO_LARGE'
          })
        })
      );
    });

    it('should handle syntax errors (malformed JSON)', () => {
      const error = new SyntaxError('Unexpected token in JSON');
      (error as any).body = true;
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Invalid JSON format in request body',
            code: 'INVALID_JSON'
          })
        })
      );
    });

    it('should handle OpenAI errors', () => {
      const error = new Error('OpenAI API rate limit exceeded');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(503);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Analysis service temporarily unavailable. Please try again later.',
            code: 'ANALYSIS_SERVICE_ERROR'
          })
        })
      );
    });

    it('should handle unknown errors with default message', () => {
      const error = new Error('Some unknown error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'An unexpected error occurred. Please try again later.',
            code: 'INTERNAL_ERROR',
            statusCode: 500
          })
        })
      );
    });

    it('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: expect.any(String)
          })
        })
      );
    });

    it('should not include stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      const response = jsonSpy.mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();
    });

    it('should include request details in error response', () => {
      const error = new AppError('Test error', 400);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            path: '/test',
            method: 'GET',
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should include request ID if present', () => {
      mockReq.headers!['x-request-id'] = 'test-request-id';
      const error = new AppError('Test error', 400);
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'test-request-id'
          })
        })
      );
    });
  });
});