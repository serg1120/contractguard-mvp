#!/usr/bin/env node

/**
 * Environment validation script
 * Run this script to validate your environment configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ContractGuard Environment Validation\n');

const requiredVars = [
  'DATABASE_URL',
  'JWT_SECRET', 
  'OPENAI_API_KEY'
];

const recommendedVars = [
  'NODE_ENV',
  'PORT',
  'OPENAI_MODEL',
  'MAX_FILE_SIZE',
  'CORS_ORIGIN'
];

// Check if .env file exists
const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('📝 To create your .env file:');
  console.log(`   cp ${envExamplePath} ${envPath}`);
  console.log('   Then edit .env with your actual values\n');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

let hasErrors = false;
let hasWarnings = false;

console.log('✅ .env file found\n');

// Check required variables
console.log('🔐 Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`   ❌ ${varName}: Missing (REQUIRED)`);
    hasErrors = true;
  } else {
    // Validate specific formats
    if (varName === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
      console.log(`   ⚠️  ${varName}: Should be a PostgreSQL URL`);
      hasWarnings = true;
    } else if (varName === 'JWT_SECRET' && value.length < 32) {
      console.log(`   ⚠️  ${varName}: Should be at least 32 characters long`);
      hasWarnings = true;
    } else if (varName === 'OPENAI_API_KEY' && !value.startsWith('sk-')) {
      console.log(`   ⚠️  ${varName}: Should start with 'sk-'`);
      hasWarnings = true;
    } else {
      console.log(`   ✅ ${varName}: Set`);
    }
  }
});

console.log('\n📋 Recommended Variables:');
recommendedVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`   ⚠️  ${varName}: Not set (using default)`);
    hasWarnings = true;
  } else {
    console.log(`   ✅ ${varName}: ${value}`);
  }
});

// Additional validations
console.log('\n🔧 Configuration Checks:');

const port = process.env.PORT || 5000;
if (isNaN(port) || port < 1 || port > 65535) {
  console.log('   ❌ PORT: Invalid port number');
  hasErrors = true;
} else {
  console.log(`   ✅ PORT: ${port}`);
}

const maxFileSize = process.env.MAX_FILE_SIZE || 10485760;
if (isNaN(maxFileSize) || maxFileSize > 50 * 1024 * 1024) {
  console.log('   ⚠️  MAX_FILE_SIZE: Consider limiting to 50MB or less');
  hasWarnings = true;
} else {
  console.log(`   ✅ MAX_FILE_SIZE: ${Math.round(maxFileSize / 1024 / 1024)}MB`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (!['development', 'production', 'test'].includes(nodeEnv)) {
  console.log('   ⚠️  NODE_ENV: Should be development, production, or test');
  hasWarnings = true;
} else {
  console.log(`   ✅ NODE_ENV: ${nodeEnv}`);
}

// Security checks for production
if (nodeEnv === 'production') {
  console.log('\n🔒 Production Security Checks:');
  
  if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-here-make-it-long-and-random') {
    console.log('   ❌ JWT_SECRET: Using example value in production!');
    hasErrors = true;
  }
  
  if (process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.log('   ❌ OPENAI_API_KEY: Using example value in production!');
    hasErrors = true;
  }
  
  if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === 'http://localhost:3000') {
    console.log('   ⚠️  CORS_ORIGIN: Should be set to your production domain');
    hasWarnings = true;
  }
}

// Summary
console.log('\n📊 Validation Summary:');
if (hasErrors) {
  console.log('❌ Configuration has ERRORS - please fix before running the application');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Configuration has warnings - application will run but some issues should be addressed');
  process.exit(0);
} else {
  console.log('✅ Configuration looks good!');
  process.exit(0);
}