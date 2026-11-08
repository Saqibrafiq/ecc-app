import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import {
  approveSquadAction,
  BoardAccessState,
  BoardSquadView,
  getBoardSquad,
  sendBackSquadAction,
  setDeadlineAction,
  setExceptionAction,
} from '@/features/board'
import { PageMain } from '@/shared/ui/page-main'

import { parseRouteId } from '../../../route-id'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('boardSquadTitle') }
}

export const dynamic = 'force-dynamic'

const ACTIONS = {
  approve: approveSquadAction,
  sendBack: sendBackSquadAction,
  setDeadline: setDeadlineAction,
  setException: setExceptionAction,
}

export default async function BoardSquadPage({
  params,
}: PageProps<'/[locale]/board/squad/[fixtureId]'>) {
  const fixtureId = parseRouteId((await params).fixtureId)
  const result =
    fixtureId === null ? { kind: 'not-found' as const } : await getBoardSquad(fixtureId)
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <PageMain hasNav={false}>
      {result.kind === 'squad' ? (
        <BoardSquadView
          squad={result.squad}
          isPreview={result.isPreview}
          actions={result.isPreview ? undefined : ACTIONS}
        />
      ) : (
        <BoardAccessState kind={result.kind} />
      )}
    </PageMain>
  )
}
