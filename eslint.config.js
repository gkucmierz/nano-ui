export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-app/**',
      '**/dist-ssg/**',
      '**/.git/**',
      'public/**',
    ],
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'indent': ['error', 2],
      'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
      'linebreak-style': ['error', 'unix'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'no-debugger': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-multiple-empty-lines': ['error', { max: 1, maxBOF: 0, maxEOF: 0 }],
      'comma-dangle': ['error', 'only-multiline'],
      'no-sparse-arrays': 'error',
    },
  },
];
