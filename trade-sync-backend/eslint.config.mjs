// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**'],
  },
  eslint.configs.recommended,
  // We switch to standard recommended (faster, less nagging than TypeChecked)
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  {
    rules: {
      // Relaxed Rules for Rapid Development
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any'
      '@typescript-eslint/no-require-imports': 'off', // Allow require() if absolutely needed
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ], // Warn only
      '@typescript-eslint/no-empty-function': 'warn',

      // Prettier Integration
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
