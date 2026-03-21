import type { LinguiConfig } from '@lingui/conf'

const config: LinguiConfig = {
  locales: ['en', 'ru', 'az', 'tr'],
  sourceLocale: 'en',
  catalogs: [
    {
      path: 'src/locales/{locale}',
      include: ['src'],
    },
  ],
}

export default config
