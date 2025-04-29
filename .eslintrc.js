module.exports = {
    parser: '@typescript-eslint/parser',
    extends: [
      'plugin:@typescript-eslint/recommended',
      // "plugin:prettier/recommended"
    ],
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'max-len': ['error', { 'code': 120 }],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'eqeqeq': ['error', 'always'],
      'no-trailing-spaces': 'off',
      'object-curly-spacing': ['error', 'always'],
    },
    env: {
      node: true,
      jest: true,
    },
    ignorePatterns: ['dist', 'node_modules', '*.js'],
  };