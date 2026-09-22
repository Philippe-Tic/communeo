// Config ESLint partagée des packages V2 (apps/backend a son propre lint, voir #103).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/build/**', '**/.turbo/**', '**/node_modules/**', 'admin/**', 'sites/**', 'docs/**', 'apps/backend/**', 'v2/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Données de test partielles : les conversions de type sont assumées
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
);
