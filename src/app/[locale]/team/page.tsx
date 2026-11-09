import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { decideCorrectionAction, getTeamWeek, TeamWeekView } from '@/features/team'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from '../app-nav'
import { parseRouteId } from '../route-id'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('teamTitle') }
}

// Today's practices and the captain's squads: rendered per request.
export const dynamic = 'force-dynamic'

export default async function TeamPage({ searchParams }: PageProps<'/[locale]/team'>) {
  const { team } = await searchParams
  const result = await getTeamWeek(typeof team === 'string' ? parseRouteId(team) : null)
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <>
      <PageMain>
        <TeamWeekView
          result={result}
          decideCorrection={
            result.kind === 'team-week' && !result.isPreview ? decideCorrectionAction : undefined
          }
        />
      </PageMain>
      <AppNav />
    </>
  )
}
