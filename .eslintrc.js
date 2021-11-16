module.exports = {
  ignorePatterns: ['/build/**', 'node_modules/**'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jest', 'prettier'],
  env: {
    es6: true,
    'jest/globals': true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
    'prettier/prettier': 'error',
  },
};
