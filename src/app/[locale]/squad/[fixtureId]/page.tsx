import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { getTeamSheet, TeamSheetState, TeamSheetView } from '@/features/squad'
import { PageMain } from '@/shared/ui/page-main'

import { parseRouteId } from '../../route-id'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('squadTitle') }
}

export const dynamic = 'force-dynamic'

export default async function TeamSheetPage({ params }: PageProps<'/[locale]/squad/[fixtureId]'>) {
  const fixtureId = parseRouteId((await params).fixtureId)
  const result = fixtureId === null ? { kind: 'not-found' as const } : await getTeamSheet(fixtureId)
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <PageMain hasNav={false}>
      {result.kind === 'sheet' ? (
        <TeamSheetView sheet={result.sheet} isPreview={result.isPreview} />
      ) : (
        <TeamSheetState kind={result.kind} />
      )}
    </PageMain>
  )
}
