const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.angular/**'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@typescript-eslint': tseslint.plugin, '@angular-eslint': angular.tsPlugin },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/prefer-inject': 'error',
      '@typescript-eslint/no-duplicate-enum-values': 'error',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'error'
    }
  },
  {
    files: ['src/**/*.html'], languageOptions: { parser: angular.templateParser },
    plugins: { '@angular-eslint/template': angular.templatePlugin },
    rules: { '@angular-eslint/template/banana-in-box': 'error', '@angular-eslint/template/eqeqeq': 'warn' }
  }
);
