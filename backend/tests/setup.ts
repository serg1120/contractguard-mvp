/**
 * Jest test setup file
 */
import '@types/jest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/contractguard_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.OPENAI_API_KEY = 'sk-test-key-for-testing-purposes-only';
process.env.PORT = '5001';
process.env.ENABLE_REQUEST_LOGGING = 'false';
process.env.LOG_LEVEL = 'error';

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDate(): R;
      toBeValidEmail(): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeValidDate(received: any) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid date`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid date`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid email`,
        pass: false,
      };
    }
  }
});

// Console override for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});