import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { CheckInView, getCheckIn, saveCheckInAction, TeamAccessState } from '@/features/team'
import { PageMain } from '@/shared/ui/page-main'

import { parseRouteId } from '../../route-id'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('checkInTitle') }
}

export const dynamic = 'force-dynamic'

export default async function CheckInPage({
  params,
}: PageProps<'/[locale]/team/check-in/[practiceId]'>) {
  const practiceId = parseRouteId((await params).practiceId)
  const result = practiceId === null ? { kind: 'not-found' as const } : await getCheckIn(practiceId)
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <PageMain hasNav={false}>
      {result.kind === 'check-in' ? (
        <CheckInView
          checkIn={result.checkIn}
          isPreview={result.isPreview}
          saveCheckIn={result.isPreview ? undefined : saveCheckInAction}
        />
      ) : (
        <TeamAccessState kind={result.kind} />
      )}
    </PageMain>
  )
}
