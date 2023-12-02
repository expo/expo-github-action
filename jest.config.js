/** @type {import('jest').Config} */
module.exports = {
  verbose: true,
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  prettierPath: require.resolve('jest-snapshot-prettier'),
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
