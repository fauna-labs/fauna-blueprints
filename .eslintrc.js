module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'standard',
    'plugin:ava/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  plugins: [
    'ava'
  ],

  overrides: [
    {
      files: ['**/resources/**/*.fql'],
      rules: {
        'no-undef': 'off',
        'no-new-func': 'off'
      }
    }
  ],
  ignorePatterns: ['temp/']
}
