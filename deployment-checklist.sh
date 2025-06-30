#!/bin/bash

echo "ContractGuard MVP Deployment Checklist"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ERRORS=$((ERRORS + 1))
    fi
}

ERRORS=0

echo "1. Checking Git Repository..."
git rev-parse --git-dir > /dev/null 2>&1
check $? "Git repository initialized"

git remote -v | grep origin > /dev/null 2>&1
if [ $? -eq 0 ]; then
    check 0 "Git remote 'origin' configured"
else
    check 1 "Git remote 'origin' not configured - run: git remote add origin <your-repo-url>"
fi

echo ""
echo "2. Checking Backend Configuration..."
if [ -f "backend/.env.example" ]; then
    check 0 "Backend .env.example exists"
else
    check 1 "Backend .env.example missing"
fi

if [ -f "backend/package.json" ]; then
    check 0 "Backend package.json exists"
else
    check 1 "Backend package.json missing"
fi

echo ""
echo "3. Checking Frontend Configuration..."
if [ -f "frontend/package.json" ]; then
    check 0 "Frontend package.json exists"
else
    check 1 "Frontend package.json missing"
fi

if [ -f "frontend/.env.production" ]; then
    check 0 "Frontend .env.production template exists"
else
    check 1 "Frontend .env.production template missing"
fi

echo ""
echo "4. Checking Deployment Files..."
if [ -f "railway.json" ]; then
    check 0 "Railway configuration exists"
else
    check 1 "Railway configuration missing"
fi

if [ -f "vercel.json" ]; then
    check 0 "Vercel configuration exists"
else
    check 1 "Vercel configuration missing"
fi

if [ -f "backend/Dockerfile" ]; then
    check 0 "Backend Dockerfile exists"
else
    check 1 "Backend Dockerfile missing"
fi

if [ -f "frontend/Dockerfile" ]; then
    check 0 "Frontend Dockerfile exists"
else
    check 1 "Frontend Dockerfile missing"
fi

echo ""
echo "5. Checking Database Files..."
if [ -f "backend/src/database/migrations/001_initial_schema.sql" ]; then
    check 0 "Database migrations exist"
else
    check 1 "Database migrations missing"
fi

echo ""
echo "6. Checking CI/CD Configuration..."
if [ -d ".github/workflows" ]; then
    check 0 "GitHub Actions workflows configured"
else
    check 1 "GitHub Actions workflows missing"
fi

echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC} Ready for deployment."
    echo ""
    echo "Next steps:"
    echo "1. Create GitHub repository and push code"
    echo "2. Follow instructions in DEPLOYMENT_STEPS.md"
    echo "3. Deploy to Railway (backend) and Vercel (frontend)"
else
    echo -e "${RED}✗ $ERRORS checks failed.${NC} Please fix issues before deploying."
fi
echo ""

# Generate quick deployment info
echo "Quick Info for Deployment:"
echo "========================="
echo ""
echo "Required Environment Variables for Railway (Backend):"
echo "- NODE_ENV=production"
echo "- JWT_SECRET=<generate with: openssl rand -base64 64>"
echo "- OPENAI_API_KEY=<your-openai-api-key>"
echo "- CORS_ORIGIN=<your-vercel-frontend-url>"
echo "- DATABASE_URL=<auto-provided by Railway PostgreSQL>"
echo ""
echo "Required Environment Variables for Vercel (Frontend):"
echo "- REACT_APP_API_URL=<your-railway-backend-url>/api"
echo "- REACT_APP_ENVIRONMENT=production"
echo "- GENERATE_SOURCEMAP=false"
echo ""