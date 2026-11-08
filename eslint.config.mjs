import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores([
    '.next/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'storybook-static/',
    'next-env.d.ts',
  ]),
  nextCoreWebVitals,
  nextTypescript,
  {
    // next/core-web-vitals already registers the jsx-a11y plugin; tighten it to the strict rule set.
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: jsxA11y.flatConfigs.strict.rules,
  },
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    rules: {
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  prettier,
)
