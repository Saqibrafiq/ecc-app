import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { getMySeason, SeasonView } from '@/features/season'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from '../app-nav'
import { ScheduleSwitch } from '../schedule-switch'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('seasonTitle') }
}

// Results and the next match day depend on today and on who is signed in: rendered per request.
export const dynamic = 'force-dynamic'

export default async function SeasonPage() {
  const result = await getMySeason()
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <>
      <PageMain>
        <ScheduleSwitch />
        <SeasonView season={result.season} isPreview={result.isPreview} />
      </PageMain>
      <AppNav />
    </>
  )
}
