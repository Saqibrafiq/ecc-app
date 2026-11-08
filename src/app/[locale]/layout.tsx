import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { MotionProvider } from '@/shared/ui/motion-provider'

import '../globals.css'

// next/font self-hosts the font files at build time: no request to Google at runtime (GDPR).
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
// Condensed display face for headings, dates and scores, as on the club website.
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-barlow-condensed',
})

/** The page colour, so the phone's status bar and the installed app's splash screen match. */
const THEME_COLOR = '#121d44'

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  colorScheme: 'dark',
  // Respect the notch and home indicator when installed (display: standalone).
  viewportFit: 'cover',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : 'en' })

  return {
    title: t('metadata.appName'),
    description: t('metadata.description'),
    applicationName: t('metadata.appName'),
    // A members' tool: keep it out of search results.
    robots: { index: false, follow: false },
    appleWebApp: {
      capable: true,
      title: t('metadata.appName'),
      statusBarStyle: 'black-translucent',
    },
    icons: { apple: '/icons/apple-touch-icon.png' },
  }
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  return (
    <html lang={locale} className={`${inter.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <MotionProvider>{children}</MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
