import { cookies } from 'next/headers'
import { locale as rootLocale } from 'next/root-params'
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import type en from './messages/en.json'
import { routing, TIME_ZONE } from './routing'

/** next-intl's middleware remembers the visitor's language in this cookie. */
const LOCALE_COOKIE = 'NEXT_LOCALE'

/**
 * The root [locale] segment of the current route. Server Actions have no route, so `root-params`
 * is not available there; the language the visitor last used (the middleware's cookie) is.
 */
async function getRouteLocale(): Promise<string | undefined> {
  try {
    return await rootLocale()
  } catch {
    const cookieStore = await cookies()
    return cookieStore.get(LOCALE_COOKIE)?.value
  }
}

export default getRequestConfig(async ({ locale: requested }) => {
  // An explicit locale (e.g. getTranslations({ locale })) wins; otherwise the route's.
  const candidate = requested ?? (await getRouteLocale())
  const locale = hasLocale(routing.locales, candidate) ? candidate : routing.defaultLocale

  const messages = (await import(`./messages/${locale}.json`)) as { default: typeof en }

  return { locale, messages: messages.default, timeZone: TIME_ZONE }
})
