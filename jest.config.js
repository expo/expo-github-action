/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  verbose: true,
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
};
