import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { getTeamWeek, TeamWeekView } from '@/features/team'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from '../app-nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('teamTitle') }
}

// Today's practices and the captain's squads: rendered per request.
export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const result = await getTeamWeek()
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <>
      <PageMain>
        <TeamWeekView result={result} />
      </PageMain>
      <AppNav />
    </>
  )
}
