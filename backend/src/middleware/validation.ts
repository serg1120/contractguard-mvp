import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'boolean';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  sanitize?: boolean;
  allowedValues?: any[];
}

export class ValidationMiddleware {
  /**
   * Create validation middleware for request body
   */
  static validateBody(rules: ValidationRule[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors: string[] = [];
        
        for (const rule of rules) {
          const value = req.body[rule.field];
          
          // Check required fields
          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${rule.field} is required`);
            continue;
          }
          
          // Skip validation if field is not provided and not required
          if (!rule.required && (value === undefined || value === null || value === '')) {
            continue;
          }
          
          // Type validation
          if (rule.type && value !== undefined && value !== null) {
            if (!ValidationMiddleware.validateType(value, rule.type)) {
              errors.push(`${rule.field} must be of type ${rule.type}`);
              continue;
            }
          }
          
          // String validations
          if (typeof value === 'string') {
            // Length validation
            if (rule.minLength !== undefined && value.length < rule.minLength) {
              errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
            }
            if (rule.maxLength !== undefined && value.length > rule.maxLength) {
              errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`);
            }
            
            // Pattern validation
            if (rule.pattern && !rule.pattern.test(value)) {
              errors.push(`${rule.field} format is invalid`);
            }
            
            // Sanitize input
            if (rule.sanitize) {
              req.body[rule.field] = ValidationMiddleware.sanitizeString(value);
            }
          }
          
          // Number validations
          if (typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
              errors.push(`${rule.field} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && value > rule.max) {
              errors.push(`${rule.field} must not exceed ${rule.max}`);
            }
          }
          
          // Allowed values validation
          if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            errors.push(`${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
          }
        }
        
        if (errors.length > 0) {
          throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Create validation middleware for query parameters
   */
  static validateQuery(rules: ValidationRule[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors: string[] = [];
        
        for (const rule of rules) {
          const value = req.query[rule.field];
          
          // Check required fields
          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${rule.field} is required`);
            continue;
          }
          
          // Skip validation if field is not provided and not required
          if (!rule.required && (value === undefined || value === null || value === '')) {
            continue;
          }
          
          // Convert string values to appropriate types
          let convertedValue = value;
          if (rule.type === 'number' && typeof value === 'string') {
            const numValue = parseInt(value as string, 10);
            if (isNaN(numValue)) {
              errors.push(`${rule.field} must be a valid number`);
              continue;
            }
            convertedValue = numValue;
            (req.query as any)[rule.field] = numValue.toString();
          }
          
          // Validate the converted value
          if (rule.type && convertedValue !== undefined && convertedValue !== null) {
            if (!ValidationMiddleware.validateType(convertedValue, rule.type)) {
              errors.push(`${rule.field} must be of type ${rule.type}`);
              continue;
            }
          }
          
          // Apply same validations as body
          if (typeof convertedValue === 'string') {
            if (rule.minLength !== undefined && convertedValue.length < rule.minLength) {
              errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
            }
            if (rule.maxLength !== undefined && convertedValue.length > rule.maxLength) {
              errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`);
            }
            if (rule.pattern && !rule.pattern.test(convertedValue)) {
              errors.push(`${rule.field} format is invalid`);
            }
            if (rule.sanitize) {
              req.query[rule.field] = ValidationMiddleware.sanitizeString(convertedValue) as any;
            }
          }
          
          if (typeof convertedValue === 'number') {
            if (rule.min !== undefined && convertedValue < rule.min) {
              errors.push(`${rule.field} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && convertedValue > rule.max) {
              errors.push(`${rule.field} must not exceed ${rule.max}`);
            }
          }
          
          if (rule.allowedValues && !rule.allowedValues.includes(convertedValue)) {
            errors.push(`${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
          }
        }
        
        if (errors.length > 0) {
          throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Create validation middleware for URL parameters
   */
  static validateParams(rules: ValidationRule[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors: string[] = [];
        
        for (const rule of rules) {
          const value = req.params[rule.field];
          
          // Check required fields
          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push(`${rule.field} is required`);
            continue;
          }
          
          // Convert string values to appropriate types
          let convertedValue = value;
          if (rule.type === 'number' && typeof value === 'string') {
            const numValue = parseInt(value, 10);
            if (isNaN(numValue)) {
              errors.push(`${rule.field} must be a valid number`);
              continue;
            }
            convertedValue = numValue;
            (req.params as any)[rule.field] = numValue.toString();
          }
          
          // Apply validations
          if (rule.type && convertedValue !== undefined && convertedValue !== null) {
            if (!ValidationMiddleware.validateType(convertedValue, rule.type)) {
              errors.push(`${rule.field} must be of type ${rule.type}`);
              continue;
            }
          }
          
          if (typeof convertedValue === 'number') {
            if (rule.min !== undefined && convertedValue < rule.min) {
              errors.push(`${rule.field} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && convertedValue > rule.max) {
              errors.push(`${rule.field} must not exceed ${rule.max}`);
            }
          }
          
          if (rule.allowedValues && !rule.allowedValues.includes(convertedValue)) {
            errors.push(`${rule.field} must be one of: ${rule.allowedValues.join(', ')}`);
          }
        }
        
        if (errors.length > 0) {
          throw new AppError(`Validation failed: ${errors.join(', ')}`, 400);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
  
  /**
   * Validate data type
   */
  private static validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      default:
        return true;
    }
  }
  
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  private static sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      // Remove potentially dangerous characters
      .replace(/[<>]/g, '')
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove on* event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Limit length for safety
      .substring(0, 1000);
  }
  
  /**
   * Validate file upload
   */
  static validateFileUpload(options: {
    required?: boolean;
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const file = (req as any).file;
        
        if (options.required && !file) {
          throw new AppError('File upload is required', 400);
        }
        
        if (!file) {
          return next(); // Skip validation if no file and not required
        }
        
        // Check file size
        if (options.maxSize && file.size > options.maxSize) {
          throw new AppError(`File size exceeds maximum limit of ${options.maxSize} bytes`, 400);
        }
        
        // Check MIME type
        if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
          throw new AppError(`File type ${file.mimetype} is not allowed`, 400);
        }
        
        // Check file extension
        if (options.allowedExtensions) {
          const extension = file.originalname.split('.').pop()?.toLowerCase();
          if (!extension || !options.allowedExtensions.includes(extension)) {
            throw new AppError(`File extension .${extension} is not allowed`, 400);
          }
        }
        
        // Sanitize filename
        if (file.originalname) {
          file.originalname = file.originalname
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .substring(0, 255);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}