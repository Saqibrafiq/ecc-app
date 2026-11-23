import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { answerAction, getMyWeek, WeekView } from '@/features/week'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from './app-nav'
import { ScheduleSwitch } from './schedule-switch'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('weekTitle') }
}

// The week depends on today and on who is signed in: rendered per request.
export const dynamic = 'force-dynamic'

export default async function WeekPage() {
  const result = await getMyWeek()
  if (result.kind === 'signed-out') return redirectToSignIn()
  const isPreview = result.kind === 'week' && result.isPreview

  return (
    <>
      <PageMain>
        <ScheduleSwitch />
        <WeekView result={result} saveAnswer={isPreview ? undefined : answerAction} />
      </PageMain>
      <AppNav />
    </>
  )
}
