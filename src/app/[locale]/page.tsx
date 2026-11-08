import { CalendarDays, ChartNoAxesColumn, UserRound } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { getMyWeek, WeekView } from '@/features/week'
import { BottomNav } from '@/shared/ui/bottom-nav'

/** The preview's member until sign-in arrives. */
const PREVIEW_MEMBER_NAME = 'Saqib Rafiq'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('weekTitle') }
}

// The week depends on today: rendered per request, never at build time.
export const dynamic = 'force-dynamic'

export default async function WeekPage() {
  const t = await getTranslations('nav')

  return (
    <>
      <main className="mx-auto w-full max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-28">
        <WeekView {...getMyWeek()} memberName={PREVIEW_MEMBER_NAME} />
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
