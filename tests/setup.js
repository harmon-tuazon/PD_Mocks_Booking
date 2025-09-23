// Test setup file
process.env.NODE_ENV = 'test';
process.env.HS_PRIVATE_APP_TOKEN = 'test-token-123456789';
process.env.CRON_SECRET = 'test-cron-secret';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};