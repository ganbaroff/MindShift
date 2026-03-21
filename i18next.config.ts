export default {
  locales: ['en', 'ru', 'az', 'tr'],
  extract: {
    input: 'src/**/*.tsx',
    output: 'src/locales/{{language}}/{{namespace}}.json',
  },
}
