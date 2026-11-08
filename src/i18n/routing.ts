import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  // English keeps clean URLs ("/week"), German is prefixed ("/de/week").
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]

/** Club rules and every date shown are in the club's local time (arc42 §8.1). */
export const TIME_ZONE = 'Europe/Berlin'
