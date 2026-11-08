import { render, type RenderOptions } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactElement, ReactNode } from 'react'

import de from '@/i18n/messages/de.json'
import en from '@/i18n/messages/en.json'
import { type Locale, TIME_ZONE } from '@/i18n/routing'

const MESSAGES = { en, de } as const

type RenderWithIntlOptions = Omit<RenderOptions, 'wrapper'> & { locale?: Locale }

/** Renders a component with the real message catalogue, as next-intl does in the app. */
export function renderWithIntl(
  ui: ReactElement,
  { locale = 'en', ...options }: RenderWithIntlOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]} timeZone={TIME_ZONE}>
        {children}
      </NextIntlClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
