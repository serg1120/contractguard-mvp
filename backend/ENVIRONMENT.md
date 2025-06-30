# Environment Configuration Guide

This guide explains how to configure the ContractGuard MVP backend environment.

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file with your actual values**

3. **Validate your configuration:**
   ```bash
   node scripts/validate-env.js
   ```

## Required Environment Variables

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
  - Format: `postgresql://username:password@localhost:5432/contractguard`
  - Example: `postgresql://postgres:mypassword@localhost:5432/contractguard`

### Security Configuration
- `JWT_SECRET` - Secret key for JWT token generation
  - **IMPORTANT**: Must be at least 32 characters long
  - Generate with: `openssl rand -base64 32`
  - Example: `your-super-secret-jwt-key-here-make-it-long-and-random`

### OpenAI Integration
- `OPENAI_API_KEY` - Your OpenAI API key
  - Get from: https://platform.openai.com/api-keys
  - Format: `sk-...`

## Optional Environment Variables

### Server Configuration
- `NODE_ENV` - Application environment (default: `development`)
  - Values: `development`, `production`, `test`
- `PORT` - Server port (default: `5000`)

### OpenAI Configuration
- `OPENAI_MODEL` - AI model to use (default: `gpt-4o-mini`)
- `OPENAI_MAX_TOKENS` - Maximum tokens per request (default: `2000`)
- `OPENAI_TEMPERATURE` - AI creativity level 0-2 (default: `0.1`)

### File Upload Configuration
- `MAX_FILE_SIZE` - Maximum file size in bytes (default: `10485760` = 10MB)
- `ALLOWED_FILE_TYPES` - Comma-separated MIME types (default: `application/pdf`)
- `UPLOAD_PATH` - Upload directory path (default: `./uploads`)

### Rate Limiting Configuration
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (default: `900000` = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: `100`)
- `AUTH_RATE_LIMIT_MAX` - Max auth attempts per window (default: `5`)
- `UPLOAD_RATE_LIMIT_MAX` - Max uploads per hour (default: `10`)
- `ANALYSIS_RATE_LIMIT_MAX` - Max analysis requests per hour (default: `20`)

### CORS Configuration
- `CORS_ORIGIN` - Allowed origins (default: `http://localhost:3000`)
- `CORS_CREDENTIALS` - Allow credentials (default: `true`)

### Logging Configuration
- `LOG_LEVEL` - Logging level (default: `info`)
- `LOG_FILE` - Log file path (optional)
- `ENABLE_REQUEST_LOGGING` - Enable request logging (default: `true`)

### Security Configuration
- `BCRYPT_ROUNDS` - Password hashing rounds (default: `12`)
- `SESSION_TIMEOUT` - Session timeout in milliseconds (default: `86400000` = 24 hours)

## Environment-Specific Configuration

### Development Environment
```bash
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000
ENABLE_REQUEST_LOGGING=true
LOG_LEVEL=debug
```

### Production Environment
```bash
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-domain.com
ENABLE_REQUEST_LOGGING=false
LOG_LEVEL=info
```

### Testing Environment
```bash
NODE_ENV=test
PORT=5001
DATABASE_URL=postgresql://username:password@localhost:5432/contractguard_test
ENABLE_REQUEST_LOGGING=false
LOG_LEVEL=warn
```

## Security Best Practices

### JWT Secret
- **Never use the example JWT secret in production**
- Generate a strong, random secret:
  ```bash
  openssl rand -base64 32
  ```
- Rotate secrets periodically

### Database Security
- Use strong database passwords
- Enable SSL for production databases (`DB_SSL=true`)
- Restrict database access to your application server

### API Keys
- **Never commit API keys to version control**
- Use environment-specific API keys
- Rotate API keys regularly
- Monitor API key usage

### CORS Configuration
- Set specific domains for production
- Avoid using `*` for CORS origins
- Only enable credentials when necessary

## Environment Validation

Run the validation script to check your configuration:

```bash
node scripts/validate-env.js
```

This script will:
- ✅ Check all required variables are set
- ⚠️ Warn about missing optional variables
- 🔒 Validate security settings for production
- 📊 Provide a configuration summary

## Troubleshooting

### Common Issues

**"Required environment variable X is not set"**
- Check that your `.env` file exists
- Verify the variable name is correct
- Ensure there are no spaces around the `=` sign

**"JWT_SECRET must be at least 32 characters long"**
- Generate a new secret: `openssl rand -base64 32`
- Update your `.env` file with the new secret

**"DATABASE_URL must be a valid PostgreSQL connection string"**
- Check the format: `postgresql://user:password@host:port/database`
- Verify database credentials and connection

**"OPENAI_API_KEY appears to be invalid"**
- Ensure the key starts with `sk-`
- Check for typos or extra spaces
- Verify the key is active in your OpenAI account

### Getting Help

1. Check the validation script output
2. Review this documentation
3. Check the application logs for specific error messages
4. Ensure all services (database, etc.) are running

## Example .env File

```bash
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/contractguard

# Security
JWT_SECRET=abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234

# OpenAI
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini

# CORS
CORS_ORIGIN=http://localhost:3000
```