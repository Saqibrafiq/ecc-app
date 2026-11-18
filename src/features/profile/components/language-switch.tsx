'use client'

import { motion } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import { useTransition } from 'react'

import { usePathname, useRouter } from '@/i18n/navigation'
import { type Locale, routing } from '@/i18n/routing'
import { cn } from '@/shared/lib/cn'

const SPRING = { type: 'spring', stiffness: 500, damping: 40 } as const

/** English or German for the whole app; the choice is kept in the language cookie (next-intl). */
export function LanguageSwitch() {
  const t = useTranslations('profile.language')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const choose = (next: Locale) => {
    if (next === locale) return
    startTransition(() => {
      router.replace(pathname, { locale: next })
    })
  }

  return (
    <div
      role="group"
      aria-label={t('title')}
      aria-busy={isPending}
      className="grid grid-cols-2 gap-1 rounded-xl bg-surface-raised p-1"
    >
      {routing.locales.map((option) => {
        const isCurrent = option === locale
        return (
          <button
            key={option}
            type="button"
            lang={option}
            aria-pressed={isCurrent}
            onClick={() => {
              choose(option)
            }}
            className={cn(
              'relative min-h-11 rounded-lg font-semibold transition-colors duration-150',
              isCurrent ? 'text-text-on-accent' : 'text-text-muted hover:text-text-default',
            )}
          >
            {isCurrent && (
              <motion.span
                layoutId="language-switch-current"
                transition={SPRING}
                aria-hidden="true"
                className="absolute inset-0 rounded-lg bg-accent-match"
              />
            )}
            <span className="relative">{t(option)}</span>
          </button>
        )
      })}
    </div>
  )
}
