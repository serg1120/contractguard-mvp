import { Router } from 'express';
import { UserModel } from '../models/User';
import { generateToken } from '../middleware/auth';
import { AppError, ConflictError, AuthenticationError } from '../middleware/errorHandler';
import { ValidationMiddleware } from '../middleware/validation';
import { RateLimiter } from '../middleware/rateLimiter';
import { ResponseFormatter } from '../utils/responseFormatter';

const router = Router();

// Validation rules
const registrationValidation = ValidationMiddleware.validateBody([
  { field: 'email', required: true, type: 'email', sanitize: true },
  { field: 'password', required: true, type: 'string', minLength: 8, maxLength: 128 },
  { field: 'company_name', required: false, type: 'string', maxLength: 200, sanitize: true },
  { field: 'full_name', required: false, type: 'string', maxLength: 100, sanitize: true }
]);

const loginValidation = ValidationMiddleware.validateBody([
  { field: 'email', required: true, type: 'email', sanitize: true },
  { field: 'password', required: true, type: 'string', minLength: 1, maxLength: 128 }
]);

// Register endpoint
router.post('/register', RateLimiter.auth, registrationValidation, async (req, res, next) => {
  try {

    const { email, password, company_name, full_name } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create new user
    const user = await UserModel.create({
      email,
      password,
      company_name,
      full_name
    });

    // Generate token
    const token = generateToken(user.id!, user.email);

    ResponseFormatter.authenticated(res, user, token, true);
  } catch (error) {
    next(error);
  }
});

// Login endpoint
router.post('/login', RateLimiter.auth, loginValidation, async (req, res, next) => {
  try {

    const { email, password } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, password);
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate token
    const token = generateToken(user.id!, user.email);

    ResponseFormatter.authenticated(res, user, token, false);
  } catch (error) {
    next(error);
  }
});

// Logout endpoint (client-side token removal)
router.post('/logout', (req, res) => {
  ResponseFormatter.success(res, null, 'Logged out successfully');
});

export default router;