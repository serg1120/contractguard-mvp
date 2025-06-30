# ContractGuard MVP Deployment Steps

Follow these steps to deploy your ContractGuard application to production.

## Prerequisites
- GitHub account
- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- OpenAI API key

## Step 1: Push to GitHub

1. Create a new repository on GitHub named `contractguard-mvp`
2. Push your local repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/contractguard-mvp.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway

1. Go to [Railway](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `contractguard-mvp` repository
4. Railway will detect the Dockerfile automatically

### Configure Railway Environment Variables:
Click on your service → Variables tab, and add:

```
NODE_ENV=production
JWT_SECRET=<generate-64-char-secret>
OPENAI_API_KEY=<your-openai-api-key>
CORS_ORIGIN=https://your-frontend-domain.vercel.app
TRUST_PROXY=true
```

To generate JWT secret:
```bash
openssl rand -base64 64
```

### Add PostgreSQL:
1. In Railway dashboard, click "New" → "Database" → "PostgreSQL"
2. Railway will automatically add `DATABASE_URL` to your backend service

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

### Configure Vercel Environment Variables:
In project settings → Environment Variables:

```
REACT_APP_API_URL=https://your-backend.railway.app/api
REACT_APP_APP_NAME=ContractGuard
REACT_APP_VERSION=1.0.0
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_ERROR_TRACKING=false
GENERATE_SOURCEMAP=false
```

## Step 4: Final Configuration

### Update CORS Origin in Railway:
Once Vercel gives you a URL, update the Railway backend:
```
CORS_ORIGIN=https://contractguard-mvp.vercel.app
```

### Run Database Migrations:
In Railway, use the Railway CLI or web terminal:
```bash
railway run npm run migrate
railway run npm run migrate:seed  # Optional: add demo data
```

## Step 5: Verify Deployment

1. Check backend health:
   ```
   curl https://your-backend.railway.app/health
   ```

2. Check frontend:
   - Visit your Vercel URL
   - Try registering a new account
   - Upload a test contract

## Step 6: Custom Domain (Optional)

### Backend (Railway):
1. Go to Settings → Domains
2. Add custom domain (e.g., `api.contractguard.com`)
3. Update DNS records

### Frontend (Vercel):
1. Go to Settings → Domains  
2. Add custom domain (e.g., `contractguard.com`)
3. Update DNS records

### Update Environment Variables:
- Railway: `CORS_ORIGIN=https://contractguard.com`
- Vercel: `REACT_APP_API_URL=https://api.contractguard.com/api`

## Troubleshooting

### Backend Issues:
- Check Railway logs: Dashboard → View Logs
- Verify DATABASE_URL is set correctly
- Ensure JWT_SECRET is set
- Check CORS_ORIGIN matches frontend URL

### Frontend Issues:
- Check Vercel build logs
- Verify REACT_APP_API_URL is correct (include /api)
- Check browser console for errors

### Database Issues:
- Ensure migrations ran successfully
- Check PostgreSQL service is running in Railway
- Verify DATABASE_URL in backend service

## Monitor Your Application

- Backend logs: Railway dashboard → Logs
- Frontend logs: Vercel dashboard → Functions
- Health endpoint: `https://your-api.railway.app/health`
- Metrics endpoint: `https://your-api.railway.app/metrics`

## Next Steps

1. Set up error tracking (Sentry)
2. Configure custom domains
3. Set up monitoring alerts
4. Add SSL certificates (automatic with Railway/Vercel)
5. Regular backups of PostgreSQL database