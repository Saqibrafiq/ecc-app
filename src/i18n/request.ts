import { locale as rootLocale } from 'next/root-params'
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import type en from './messages/en.json'
import { routing, TIME_ZONE } from './routing'

export default getRequestConfig(async ({ locale: requested }) => {
  // An explicit locale (e.g. getTranslations({ locale })) wins; otherwise the root [locale] segment.
  const candidate = requested ?? (await rootLocale())
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale

  const messages = (await import(`./messages/${locale}.json`)) as { default: typeof en }

  return { locale, messages: messages.default, timeZone: TIME_ZONE }
})
