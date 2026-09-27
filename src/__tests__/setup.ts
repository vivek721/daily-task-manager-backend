import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random available port for tests

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Generate test user data
const generateTestUser = () => ({
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  google_id: 'google-123',
  created_at: new Date(),
  updated_at: new Date(),
});

// Global test utilities
export const testUtils = {
  generateTestUser,

  // Generate test task data
  generateTestTask: () => ({
    id: 'test-task-123',
    title: 'Test Task',
    description: 'Test task description',
    completed: false,
    priority: 'medium' as const,
    category: 'work',
    due_date: new Date(),
    user_id: 'test-user-123',
    created_at: new Date(),
    updated_at: new Date(),
  }),

  // Mock authenticated request
  mockAuthRequest: (user = generateTestUser()) => ({
    user,
    headers: {
      authorization: 'Bearer test-jwt-token',
    },
  }),
};

// Declare global for TypeScript
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: typeof testUtils;
    }
  }
}

// Make testUtils available globally
(global as any).testUtils = testUtils;
