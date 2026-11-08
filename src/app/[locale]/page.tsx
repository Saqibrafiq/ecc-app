import { CalendarDays, ChartNoAxesColumn, UserRound } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

import { signOutAction } from '@/features/auth'
import { answerAction, getMyWeek, WeekView } from '@/features/week'
import { getPathname } from '@/i18n/navigation'
import { BottomNav } from '@/shared/ui/bottom-nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('weekTitle') }
}

// The week depends on today and on who is signed in: rendered per request.
export const dynamic = 'force-dynamic'

export default async function WeekPage() {
  const result = await getMyWeek()
  if (result.kind === 'signed-out') {
    redirect(getPathname({ href: '/login', locale: await getLocale() }))
  }
  const t = await getTranslations('nav')
  const tState = await getTranslations('weekState')
  const isPreview = result.kind === 'week' && result.isPreview

  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">
        <WeekView result={result} saveAnswer={isPreview ? undefined : answerAction} />
        {!isPreview && (
          <form action={signOutAction} className="self-center">
            <button
              type="submit"
              className="min-h-11 rounded-xl px-4 text-sm font-semibold text-text-muted transition-colors duration-150 hover:bg-surface-raised hover:text-text-default"
            >
              {tState('signOut')}
            </button>
          </form>
        )}
      </main>
      <BottomNav
        label={t('label')}
        comingSoonLabel={t('comingSoon')}
        items={[
          {
            href: '/',
            label: t('week'),
            icon: <CalendarDays aria-hidden="true" className="size-5" />,
          },
          {
            href: '/attendance',
            label: t('attendance'),
            icon: <ChartNoAxesColumn aria-hidden="true" className="size-5" />,
            isComingSoon: true,
          },
          {
            href: '/profile',
            label: t('profile'),
            icon: <UserRound aria-hidden="true" className="size-5" />,
            isComingSoon: true,
          },
        ]}
      />
    </>
  )
}
