module.exports = {
  root: true,
  extends: ['universe/node'],
  ignorePatterns: ['build/**', 'node_modules/**'],
  rules: {
    'prettier/prettier': 'error',
    'sort-imports': [
      'warn',
      {
        ignoreDeclarationSort: true,
      },
    ],
    curly: 'warn',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.d.ts'],
      extends: ['universe/shared/typescript-analysis'],
      excludedFiles: ['**/tests/**'],
      parserOptions: {
        project: './tsconfig.json',
      },
      rules: {
        '@typescript-eslint/prefer-nullish-coalescing': ['warn', { ignorePrimitives: true }],
        '@typescript-eslint/no-confusing-void-expression': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/await-thenable': 'off',
        '@typescript-eslint/return-await': ['warn', 'error-handling-correctness-only'],
      },
    },
  ],
};
