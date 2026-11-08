import { defineRouting } from 'next-intl/routing'

import { CLUB_TIME_ZONE } from '@/domain/club-rules'

export const routing = defineRouting({
  locales: ['en', 'de'],
  defaultLocale: 'en',
  // English keeps clean URLs ("/week"), German is prefixed ("/de/week").
  localePrefix: 'as-needed',
})

export type Locale = (typeof routing.locales)[number]

/** Every date shown is in the club's local time, the same zone the club rules use (arc42 §8.1). */
export const TIME_ZONE = CLUB_TIME_ZONE
