import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Generate request ID
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to headers for tracking
  res.setHeader('x-request-id', requestId);
  req.headers['x-request-id'] = requestId;
  
  // Log request details
  const logData = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('Content-Length'),
    contentType: req.get('Content-Type'),
    // Don't log sensitive headers
    headers: {
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept,
      'origin': req.headers.origin,
      'referer': req.headers.referer
    }
  };
  
  console.log('Request:', logData);
  
  // Capture response details
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    const responseLog = {
      timestamp: new Date().toISOString(),
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      contentType: res.get('Content-Type')
    };
    
    // Log based on status code
    if (res.statusCode >= 400) {
      console.warn('Response Error:', responseLog);
    } else {
      console.log('Response:', responseLog);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Simple request logger for production (less verbose)
 */
export const simpleRequestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logMessage = `${req.method} ${req.path} ${res.statusCode} ${duration}ms - ${req.ip}`;
    
    if (res.statusCode >= 400) {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  });
  
  next();
};