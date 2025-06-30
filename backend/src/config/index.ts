import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface DatabaseConfig {
  url: string;
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface FileUploadConfig {
  maxFileSize: number;
  allowedTypes: string[];
  uploadPath: string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  authMax: number;
  uploadMax: number;
  analysisMax: number;
}

export interface CORSConfig {
  origin: string | string[];
  credentials: boolean;
}

export interface LoggingConfig {
  level: string;
  file?: string;
  enableRequestLogging: boolean;
}

export interface SecurityConfig {
  bcryptRounds: number;
  sessionTimeout: number;
}

export interface AppConfig {
  env: string;
  port: number;
  database: DatabaseConfig;
  jwt: JWTConfig;
  openai: OpenAIConfig;
  fileUpload: FileUploadConfig;
  rateLimit: RateLimitConfig;
  cors: CORSConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  externalServiceTimeout: number;
  retryAttempts: number;
  featureFlags: {
    enableAnalytics: boolean;
    enableMonitoring: boolean;
    enableCache: boolean;
  };
}

/**
 * Configuration validation and management
 */
class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  private loadConfig(): AppConfig {
    return {
      env: this.getEnvVar('NODE_ENV', 'development'),
      port: this.getEnvVarAsNumber('PORT', 5000),
      
      database: {
        url: this.getRequiredEnvVar('DATABASE_URL'),
        host: this.getEnvVar('DB_HOST', 'localhost'),
        port: this.getEnvVarAsNumber('DB_PORT', 5432),
        name: this.getEnvVar('DB_NAME', 'contractguard'),
        user: this.getEnvVar('DB_USER', 'postgres'),
        password: this.getEnvVar('DB_PASSWORD', ''),
        ssl: this.getEnvVarAsBoolean('DB_SSL', false)
      },
      
      jwt: {
        secret: this.getRequiredEnvVar('JWT_SECRET'),
        expiresIn: this.getEnvVar('JWT_EXPIRES_IN', '24h')
      },
      
      openai: {
        apiKey: this.getRequiredEnvVar('OPENAI_API_KEY'),
        model: this.getEnvVar('OPENAI_MODEL', 'gpt-4o-mini'),
        maxTokens: this.getEnvVarAsNumber('OPENAI_MAX_TOKENS', 2000),
        temperature: this.getEnvVarAsNumber('OPENAI_TEMPERATURE', 0.1),
        timeout: this.getEnvVarAsNumber('EXTERNAL_SERVICE_TIMEOUT', 30000)
      },
      
      fileUpload: {
        maxFileSize: this.getEnvVarAsNumber('MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
        allowedTypes: this.getEnvVar('ALLOWED_FILE_TYPES', 'application/pdf').split(','),
        uploadPath: this.getEnvVar('UPLOAD_PATH', './uploads')
      },
      
      rateLimit: {
        windowMs: this.getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
        maxRequests: this.getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),
        authMax: this.getEnvVarAsNumber('AUTH_RATE_LIMIT_MAX', 5),
        uploadMax: this.getEnvVarAsNumber('UPLOAD_RATE_LIMIT_MAX', 10),
        analysisMax: this.getEnvVarAsNumber('ANALYSIS_RATE_LIMIT_MAX', 20)
      },
      
      cors: {
        origin: this.getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
        credentials: this.getEnvVarAsBoolean('CORS_CREDENTIALS', true)
      },
      
      logging: {
        level: this.getEnvVar('LOG_LEVEL', 'info'),
        file: this.getEnvVar('LOG_FILE'),
        enableRequestLogging: this.getEnvVarAsBoolean('ENABLE_REQUEST_LOGGING', true)
      },
      
      security: {
        bcryptRounds: this.getEnvVarAsNumber('BCRYPT_ROUNDS', 12),
        sessionTimeout: this.getEnvVarAsNumber('SESSION_TIMEOUT', 24 * 60 * 60 * 1000) // 24 hours
      },
      
      externalServiceTimeout: this.getEnvVarAsNumber('EXTERNAL_SERVICE_TIMEOUT', 30000),
      retryAttempts: this.getEnvVarAsNumber('RETRY_ATTEMPTS', 3),
      
      featureFlags: {
        enableAnalytics: this.getEnvVarAsBoolean('ENABLE_ANALYTICS', false),
        enableMonitoring: this.getEnvVarAsBoolean('ENABLE_MONITORING', false),
        enableCache: this.getEnvVarAsBoolean('ENABLE_CACHE', false)
      }
    };
  }

  private getEnvVar(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined && defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value || defaultValue!;
  }

  private getRequiredEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  private getEnvVarAsNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
      }
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
    }
    return parsed;
  }

  private getEnvVarAsBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue === undefined) {
        throw new Error(`Environment variable ${key} is required but not set`);
      }
      return defaultValue;
    }
    
    return value.toLowerCase() === 'true' || value === '1';
  }

  private validateConfig(): void {
    const errors: string[] = [];
    
    // Validate JWT secret length
    if (this.config.jwt.secret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long for security');
    }
    
    // Validate port range
    if (this.config.port < 1 || this.config.port > 65535) {
      errors.push('PORT must be between 1 and 65535');
    }
    
    // Validate OpenAI configuration
    if (!this.config.openai.apiKey.startsWith('sk-')) {
      errors.push('OPENAI_API_KEY appears to be invalid (should start with sk-)');
    }
    
    if (this.config.openai.temperature < 0 || this.config.openai.temperature > 2) {
      errors.push('OPENAI_TEMPERATURE must be between 0 and 2');
    }
    
    // Validate file upload size
    if (this.config.fileUpload.maxFileSize > 50 * 1024 * 1024) { // 50MB
      errors.push('MAX_FILE_SIZE should not exceed 50MB for performance reasons');
    }
    
    // Validate bcrypt rounds
    if (this.config.security.bcryptRounds < 10 || this.config.security.bcryptRounds > 15) {
      errors.push('BCRYPT_ROUNDS should be between 10 and 15 for optimal security/performance balance');
    }
    
    // Validate database URL format
    if (!this.config.database.url.startsWith('postgresql://')) {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
    }
    
    if (errors.length > 0) {
      console.error('Configuration validation errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      
      if (this.config.env === 'production') {
        throw new Error('Configuration validation failed in production environment');
      } else {
        console.warn('Configuration validation failed in development environment - proceeding with warnings');
      }
    }
  }

  /**
   * Get environment-specific configuration
   */
  isDevelopment(): boolean {
    return this.config.env === 'development';
  }

  isProduction(): boolean {
    return this.config.env === 'production';
  }

  isTest(): boolean {
    return this.config.env === 'test';
  }

  /**
   * Print configuration summary (without sensitive values)
   */
  printConfigSummary(): void {
    console.log('ContractGuard Configuration Summary:');
    console.log(`  Environment: ${this.config.env}`);
    console.log(`  Port: ${this.config.port}`);
    console.log(`  Database Host: ${this.config.database.host}:${this.config.database.port}`);
    console.log(`  Database Name: ${this.config.database.name}`);
    console.log(`  OpenAI Model: ${this.config.openai.model}`);
    console.log(`  Max File Size: ${Math.round(this.config.fileUpload.maxFileSize / 1024 / 1024)}MB`);
    console.log(`  Upload Path: ${this.config.fileUpload.uploadPath}`);
    console.log(`  JWT Expires In: ${this.config.jwt.expiresIn}`);
    console.log(`  CORS Origin: ${this.config.cors.origin}`);
    console.log(`  Request Logging: ${this.config.logging.enableRequestLogging ? 'Enabled' : 'Disabled'}`);
    console.log(`  Feature Flags: Analytics=${this.config.featureFlags.enableAnalytics}, Monitoring=${this.config.featureFlags.enableMonitoring}, Cache=${this.config.featureFlags.enableCache}`);
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance().getConfig();
export const configManager = ConfigManager.getInstance();

// Validate configuration on import
if (process.env.NODE_ENV !== 'test') {
  configManager.printConfigSummary();
}