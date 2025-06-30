import winston from 'winston';
import { config } from '../config';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors for console output
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Custom format for console logging
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Custom format for file logging
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define transports
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (config.nodeEnv === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// File transport for production
if (config.nodeEnv === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Console transport for production (structured logging)
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  levels: logLevels,
  transports,
  exitOnError: false,
});

// Request logging middleware
export const requestLoggerConfig = {
  transports: [
    new winston.transports.File({
      filename: 'logs/access.log',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: false,
};

// Application logger with additional methods
export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;

  private constructor() {
    this.winston = logger;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  public error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.winston.error(message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...meta,
      });
    } else {
      this.winston.error(message, { error, ...meta });
    }
  }

  public debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  public http(message: string, meta?: any): void {
    this.winston.http(message, meta);
  }

  // Security-related logging
  public security(event: string, details: any): void {
    this.winston.warn(`SECURITY: ${event}`, {
      security: true,
      event,
      ...details,
    });
  }

  // Authentication logging
  public auth(event: string, userId?: string, details?: any): void {
    this.winston.info(`AUTH: ${event}`, {
      auth: true,
      event,
      userId,
      ...details,
    });
  }

  // Business logic logging
  public business(event: string, details: any): void {
    this.winston.info(`BUSINESS: ${event}`, {
      business: true,
      event,
      ...details,
    });
  }

  // Performance logging
  public performance(operation: string, duration: number, details?: any): void {
    this.winston.info(`PERFORMANCE: ${operation}`, {
      performance: true,
      operation,
      duration,
      ...details,
    });
  }

  // Database logging
  public database(operation: string, details: any): void {
    this.winston.debug(`DATABASE: ${operation}`, {
      database: true,
      operation,
      ...details,
    });
  }

  // External service logging
  public external(service: string, operation: string, details: any): void {
    this.winston.info(`EXTERNAL: ${service} - ${operation}`, {
      external: true,
      service,
      operation,
      ...details,
    });
  }
}

// Export singleton instance
export const appLogger = Logger.getInstance();

// Export winston logger for direct use
export default logger;