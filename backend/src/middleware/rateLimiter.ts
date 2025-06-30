import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';

/**
 * Rate limiting middleware for different endpoints
 */
export class RateLimiter {
  /**
   * General API rate limiter
   */
  static general = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.floor(config.rateLimit.windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.floor(config.rateLimit.windowMs / 1000)
      });
    }
  });

  /**
   * Authentication rate limiter
   */
  static auth = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    message: {
      success: false,
      error: 'Too many authentication attempts from this IP, please try again later.',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts from this IP, please try again later.',
        retryAfter: Math.floor(config.rateLimit.windowMs / 1000)
      });
    }
  });

  /**
   * File upload rate limiter
   */
  static upload = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: config.rateLimit.uploadMax,
    message: {
      success: false,
      error: 'Too many file uploads from this IP, please try again later.',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many file uploads from this IP, please try again later.',
        retryAfter: 60 * 60
      });
    }
  });

  /**
   * Analysis rate limiter
   */
  static analysis = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: config.rateLimit.analysisMax,
    message: {
      success: false,
      error: 'Too many analysis requests from this IP, please try again later.',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many analysis requests from this IP, please try again later.',
        retryAfter: 60 * 60
      });
    }
  });

  /**
   * Report generation rate limiter
   * 30 report generations per hour per IP
   */
  static report = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // Limit each IP to 30 report requests per hour
    message: {
      success: false,
      error: 'Too many report generation requests from this IP, please try again later.',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many report generation requests from this IP, please try again later.',
        retryAfter: 60 * 60
      });
    }
  });

  /**
   * Strict rate limiter for sensitive operations
   * 3 requests per 5 minutes per IP
   */
  static strict = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Limit each IP to 3 requests per 5 minutes
    message: {
      success: false,
      error: 'Too many requests for this sensitive operation, please try again later.',
      retryAfter: 5 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too many requests for this sensitive operation, please try again later.',
        retryAfter: 5 * 60
      });
    }
  });

  /**
   * Create custom rate limiter with specific settings
   */
  static custom(options: {
    windowMs: number;
    max: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
  }) {
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      message: {
        success: false,
        error: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.floor(options.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: options.skipSuccessfulRequests || false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: options.message || 'Too many requests, please try again later.',
          retryAfter: Math.floor(options.windowMs / 1000)
        });
      }
    });
  }
}