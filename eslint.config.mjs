import { defineConfig, globalIgnores } from 'eslint/config';
import universeNodeConfig from 'eslint-config-universe/flat/node.js';

export default defineConfig([
  globalIgnores(['**/build/', '**/node_modules/']),
  universeNodeConfig,
  {
    rules: {
      'n/prefer-node-protocol': [
        'error',
        {
          version: '>=24.0.0',
        },
      ],
      'sort-imports': [
        'error',
        {
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
        },
      ],
    },
  },
]);
