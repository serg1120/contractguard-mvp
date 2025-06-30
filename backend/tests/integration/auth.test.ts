import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../src/routes/auth';
import { errorHandler } from '../../src/middleware/errorHandler';

// Mock dependencies
jest.mock('../../src/models/User', () => ({
  UserModel: {
    findByEmail: jest.fn(),
    create: jest.fn(),
    verifyPassword: jest.fn()
  }
}));

jest.mock('../../src/middleware/auth', () => ({
  generateToken: jest.fn().mockReturnValue('mock-jwt-token')
}));

describe('Auth API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const { UserModel } = require('../../src/models/User');
      UserModel.findByEmail.mockResolvedValue(null);
      UserModel.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        company_name: 'Test Company',
        full_name: 'Test User'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          company_name: 'Test Company',
          full_name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBe('mock-jwt-token');
      expect(response.body.message).toContain('created');
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail when user already exists', async () => {
      const { UserModel } = require('../../src/models/User');
      UserModel.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const { UserModel } = require('../../src/models/User');
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        company_name: 'Test Company',
        full_name: 'Test User'
      };
      
      UserModel.findByEmail.mockResolvedValue(mockUser);
      UserModel.verifyPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.token).toBe('mock-jwt-token');
    });

    it('should fail with non-existent user', async () => {
      const { UserModel } = require('../../src/models/User');
      UserModel.findByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should fail with wrong password', async () => {
      const { UserModel } = require('../../src/models/User');
      const mockUser = {
        id: 1,
        email: 'test@example.com'
      };
      
      UserModel.findByEmail.mockResolvedValue(mockUser);
      UserModel.verifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      const { UserModel } = require('../../src/models/User');
      UserModel.findByEmail.mockResolvedValue(null);

      // Make multiple rapid requests
      const promises = Array(10).fill(0).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});