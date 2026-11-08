import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import {
  getSquadSelection,
  SquadSelectionView,
  submitSquadAction,
  TeamAccessState,
} from '@/features/team'
import { PageMain } from '@/shared/ui/page-main'

import { parseRouteId } from '../../route-id'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('squadTitle') }
}

export const dynamic = 'force-dynamic'

export default async function SquadPage({ params }: PageProps<'/[locale]/team/squad/[fixtureId]'>) {
  const fixtureId = parseRouteId((await params).fixtureId)
  const result =
    fixtureId === null ? { kind: 'not-found' as const } : await getSquadSelection(fixtureId)
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <PageMain hasNav={false}>
      {result.kind === 'selection' ? (
        <SquadSelectionView
          selection={result.selection}
          isPreview={result.isPreview}
          submitSquad={result.isPreview ? undefined : submitSquadAction}
        />
      ) : (
        <TeamAccessState kind={result.kind} />
      )}
    </PageMain>
  )
}
