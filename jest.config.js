module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'api/**/*.js',
    '!api/**/*.test.js',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js',
    '**/tests/e2e/**/*.test.js',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  modulePathIgnorePatterns: [
    '<rootDir>/frontend/',
  ],
  setupFiles: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
};