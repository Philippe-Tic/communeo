// Config ESLint partagée des packages V2 (apps/backend a son propre lint, voir #103).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/build/**', '**/.turbo/**', '**/node_modules/**', 'docs/**', 'apps/backend/**', 'v2/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Admin (React) : règles des hooks, globals du navigateur ; routeTree.gen.ts est généré
    files: ['apps/admin/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
    languageOptions: { globals: globals.browser },
  },
  { ignores: ['apps/admin/src/routeTree.gen.ts'] },
  {
    // Scripts Node (outillage, tests de bout en bout)
    files: ['**/*.mjs', '**/e2e/**', '**/playwright.config.ts', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
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
