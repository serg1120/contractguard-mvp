import { Request, Response, NextFunction } from 'express';
import { ValidationMiddleware } from '../../src/middleware/validation';
import { AppError } from '../../src/middleware/errorHandler';

describe('ValidationMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      file: undefined
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('validateBody', () => {
    it('should pass valid data', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'validpassword',
        name: 'John Doe'
      };

      const validator = ValidationMiddleware.validateBody([
        { field: 'email', required: true, type: 'email' },
        { field: 'password', required: true, type: 'string', minLength: 8 },
        { field: 'name', required: false, type: 'string', maxLength: 100 }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail for missing required fields', () => {
      mockReq.body = {
        password: 'validpassword'
      };

      const validator = ValidationMiddleware.validateBody([
        { field: 'email', required: true, type: 'email' },
        { field: 'password', required: true, type: 'string' }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('email is required');
    });

    it('should fail for invalid email format', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'validpassword'
      };

      const validator = ValidationMiddleware.validateBody([
        { field: 'email', required: true, type: 'email' },
        { field: 'password', required: true, type: 'string' }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('email must be of type email');
    });

    it('should fail for string length violations', () => {
      mockReq.body = {
        password: 'short'
      };

      const validator = ValidationMiddleware.validateBody([
        { field: 'password', required: true, type: 'string', minLength: 8 }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('must be at least 8 characters');
    });

    it('should sanitize input when requested', () => {
      mockReq.body = {
        name: '  <script>alert("xss")</script>John Doe  '
      };

      const validator = ValidationMiddleware.validateBody([
        { field: 'name', required: true, type: 'string', sanitize: true }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.name).not.toContain('<script>');
      expect(mockReq.body.name).toBe('John Doe');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should validate allowed values', () => {
      mockReq.body = {
        status: 'invalid_status'
      };

      const validator = ValidationMiddleware.validateBody([
        { field: 'status', required: true, type: 'string', allowedValues: ['active', 'inactive', 'pending'] }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('must be one of');
    });
  });

  describe('validateQuery', () => {
    it('should validate and convert query parameters', () => {
      mockReq.query = {
        page: '2',
        limit: '10',
        search: 'test'
      };

      const validator = ValidationMiddleware.validateQuery([
        { field: 'page', required: false, type: 'number', min: 1 },
        { field: 'limit', required: false, type: 'number', min: 1, max: 100 },
        { field: 'search', required: false, type: 'string', maxLength: 50 }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.page).toBe(2);
      expect(mockReq.query.limit).toBe(10);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail for invalid number conversion', () => {
      mockReq.query = {
        page: 'not-a-number'
      };

      const validator = ValidationMiddleware.validateQuery([
        { field: 'page', required: true, type: 'number' }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('validateParams', () => {
    it('should validate URL parameters', () => {
      mockReq.params = {
        id: '123'
      };

      const validator = ValidationMiddleware.validateParams([
        { field: 'id', required: true, type: 'number', min: 1 }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail for invalid parameter values', () => {
      mockReq.params = {
        id: 'abc'
      };

      const validator = ValidationMiddleware.validateParams([
        { field: 'id', required: true, type: 'number' }
      ]);

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('validateFileUpload', () => {
    it('should pass valid file upload', () => {
      (mockReq as any).file = {
        size: 1024 * 1024, // 1MB
        mimetype: 'application/pdf',
        originalname: 'test.pdf'
      };

      const validator = ValidationMiddleware.validateFileUpload({
        required: true,
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['pdf']
      });

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail for missing required file', () => {
      const validator = ValidationMiddleware.validateFileUpload({
        required: true
      });

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('File upload is required');
    });

    it('should fail for file size exceeding limit', () => {
      (mockReq as any).file = {
        size: 20 * 1024 * 1024, // 20MB
        mimetype: 'application/pdf',
        originalname: 'test.pdf'
      };

      const validator = ValidationMiddleware.validateFileUpload({
        maxSize: 10 * 1024 * 1024 // 10MB
      });

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('File size exceeds');
    });

    it('should fail for invalid file type', () => {
      (mockReq as any).file = {
        size: 1024,
        mimetype: 'text/plain',
        originalname: 'test.txt'
      };

      const validator = ValidationMiddleware.validateFileUpload({
        allowedTypes: ['application/pdf']
      });

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const error = (mockNext as jest.Mock).mock.calls[0][0];
      expect(error.message).toContain('File type text/plain is not allowed');
    });

    it('should sanitize filename', () => {
      (mockReq as any).file = {
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'test file with spaces & special chars!.pdf'
      };

      const validator = ValidationMiddleware.validateFileUpload({});

      validator(mockReq as Request, mockRes as Response, mockNext);

      expect((mockReq as any).file.originalname).not.toContain(' ');
      expect((mockReq as any).file.originalname).not.toContain('&');
      expect((mockReq as any).file.originalname).not.toContain('!');
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});