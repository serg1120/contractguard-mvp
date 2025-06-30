# ContractGuard MVP Deployment Guide

This guide covers deploying the ContractGuard MVP to production using Railway (backend) and Vercel (frontend).

## Prerequisites

- GitHub account with repository access
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- OpenAI API key
- Domain name (optional, for custom domains)

## Architecture Overview

- **Frontend**: React SPA hosted on Vercel
- **Backend**: Node.js API hosted on Railway
- **Database**: PostgreSQL hosted on Railway
- **CI/CD**: GitHub Actions
- **Monitoring**: Built-in health checks + optional Sentry

## 1. Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your ContractGuard repository
4. Railway will automatically detect the Dockerfile

### Step 2: Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```bash
# Required Variables
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=your-super-secret-64-char-jwt-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
CORS_ORIGIN=https://your-domain.com

# Optional Variables (with defaults)
OPENAI_MODEL=gpt-4o-mini
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=50
AUTH_RATE_LIMIT_MAX=3
UPLOAD_RATE_LIMIT_MAX=5
ANALYSIS_RATE_LIMIT_MAX=10
TRUST_PROXY=true
```

### Step 3: Add PostgreSQL Service

1. In Railway dashboard, click "New Service"
2. Select "PostgreSQL"
3. Railway will automatically create `DATABASE_URL` variable

### Step 4: Generate Secrets

Generate a secure JWT secret:
```bash
openssl rand -base64 64
```

### Step 5: Deploy

Railway will automatically deploy on every push to main branch. Monitor deployment in the Railway dashboard.

## 2. Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "New Project" → Import from GitHub
3. Select your ContractGuard repository
4. Configure project settings:
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

### Step 2: Configure Environment Variables

In Vercel dashboard, go to Settings → Environment Variables:

```bash
# Required Variables
REACT_APP_API_URL=https://your-railway-app.up.railway.app/api
REACT_APP_APP_NAME=ContractGuard
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production

# Optional Variables
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_TRACKING=true
REACT_APP_ENABLE_DEBUG=false
GENERATE_SOURCEMAP=false
```

### Step 3: Deploy

Vercel will automatically deploy on every push to main branch.

## 3. Custom Domain Setup

### Backend (Railway)

1. In Railway dashboard, go to Settings → Domains
2. Add your API subdomain (e.g., `api.contractguard.com`)
3. Update DNS records as instructed by Railway

### Frontend (Vercel)

1. In Vercel dashboard, go to Settings → Domains
2. Add your domain (e.g., `contractguard.com`)
3. Update DNS records as instructed by Vercel

## 4. SSL/TLS Configuration

Both Railway and Vercel provide automatic SSL certificates. No additional configuration needed.

## 5. Monitoring Setup

### Health Checks

The application includes built-in health check endpoints:

- **Backend Health**: `https://your-api-domain/health`
- **Backend Readiness**: `https://your-api-domain/ready`
- **Backend Liveness**: `https://your-api-domain/live`
- **Frontend Health**: `https://your-domain/health`

### Error Tracking (Optional)

1. Create a Sentry account at https://sentry.io
2. Create two projects: one for frontend, one for backend
3. Add Sentry DSN to environment variables:
   ```bash
   # Backend
   SENTRY_DSN=https://your-backend-sentry-dsn@sentry.io/project
   
   # Frontend
   REACT_APP_SENTRY_DSN=https://your-frontend-sentry-dsn@sentry.io/project
   ```

## 6. CI/CD Pipeline

The GitHub Actions workflows will automatically:

1. **On Pull Requests**: Run tests, security scans, and build checks
2. **On Main Branch**: Deploy to production after all checks pass
3. **Daily**: Run dependency audits and security scans

## 7. Database Migrations

Railway automatically runs database migrations on deployment. To run migrations manually:

```bash
# Connect to Railway database
railway login
railway connect

# Run migrations
npm run migrate
```

## 8. Backup Strategy

### Database Backup

Railway provides automated backups. To create manual backups:

1. Go to Railway dashboard → PostgreSQL service
2. Click "Backups" tab
3. Create manual backup

### Application Backup

Code is backed up in GitHub. For additional security:

1. Enable GitHub repository backup
2. Consider third-party backup services

## 9. Scaling Considerations

### Backend Scaling

Railway automatically scales based on traffic. For high-traffic scenarios:

1. Consider upgrading Railway plan
2. Implement Redis for session storage
3. Add load balancing if needed

### Frontend Scaling

Vercel automatically handles CDN and global distribution.

## 10. Security Checklist

- [ ] JWT secret is secure (64+ characters)
- [ ] OpenAI API key is production key
- [ ] CORS is configured for your domain only
- [ ] Rate limiting is enabled
- [ ] SSL/TLS is active
- [ ] Error tracking is configured
- [ ] Dependency vulnerabilities are resolved

## 11. Monitoring and Alerts

### Built-in Monitoring

- Railway provides CPU, memory, and response time metrics
- Vercel provides deployment and performance metrics

### Custom Alerts

Set up alerts for:
- Application errors (via Sentry)
- API response times
- Database connection issues
- Failed deployments

## 12. Rollback Procedure

### Railway Rollback

1. Go to Railway dashboard → Deployments
2. Select previous stable deployment
3. Click "Redeploy"

### Vercel Rollback

1. Go to Vercel dashboard → Deployments
2. Select previous stable deployment
3. Click "Promote to Production"

## 13. Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL in Railway variables
   - Verify PostgreSQL service is running

2. **CORS Errors**
   - Ensure CORS_ORIGIN matches your frontend domain
   - Check protocol (http vs https)

3. **OpenAI API Errors**
   - Verify API key is valid and has credits
   - Check rate limits in OpenAI dashboard

4. **Build Failures**
   - Check GitHub Actions logs
   - Verify all environment variables are set

### Debug Commands

```bash
# Check health endpoints
curl https://your-api-domain/health
curl https://your-api-domain/ready

# Check logs
railway logs
vercel logs
```

## 14. Cost Optimization

### Railway Costs

- Start with Hobby plan ($5/month)
- Monitor usage in dashboard
- Upgrade to Pro if needed

### Vercel Costs

- Start with Hobby plan (free)
- Monitor bandwidth usage
- Upgrade to Pro if needed

### Total Estimated Monthly Cost

- Railway Hobby: $5
- Vercel Hobby: $0
- Domain: $10-15
- **Total: $15-20/month**

## 15. Support and Maintenance

### Regular Maintenance Tasks

- [ ] Weekly dependency updates
- [ ] Monthly security audits
- [ ] Quarterly performance reviews
- [ ] Annual SSL certificate renewal (automatic)

### Getting Help

- Railway Support: https://railway.app/help
- Vercel Support: https://vercel.com/support
- Project Issues: GitHub Issues tab

---

## Quick Deployment Commands

```bash
# Generate JWT secret
openssl rand -base64 64

# Check health after deployment
curl https://your-api-domain/health
curl https://your-domain/health

# View logs
railway logs
vercel logs

# Rollback if needed
railway redeploy [deployment-id]
vercel promote [deployment-url]
```

For additional help, see the troubleshooting section or create an issue in the GitHub repository.