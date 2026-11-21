import { CalendarClock } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { getMatchDay, MatchDayView, uploadSignedSheetAction } from '@/features/match-day'
import { TeamAccessState } from '@/features/team'
import { Link } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'
import { buttonVariants } from '@/shared/ui/button-variants'
import { PageMain } from '@/shared/ui/page-main'
import { StateCard } from '@/shared/ui/state-card'

import { parseRouteId } from '../../../route-id'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('matchDayTitle') }
}

export const dynamic = 'force-dynamic'

export default async function MatchDayPage({
  params,
}: PageProps<'/[locale]/team/match-day/[fixtureId]'>) {
  const fixtureId = parseRouteId((await params).fixtureId)
  const result = fixtureId === null ? { kind: 'not-found' as const } : await getMatchDay(fixtureId)
  if (result.kind === 'signed-out') return redirectToSignIn()
  const t = await getTranslations('matchDay.notApproved')

  return (
    <PageMain hasNav={false}>
      {result.kind === 'match-day' && (
        <MatchDayView
          matchDay={result.matchDay}
          isPreview={result.isPreview}
          uploadSignedSheet={result.isPreview ? undefined : uploadSignedSheetAction}
        />
      )}
      {result.kind === 'not-approved' && (
        <StateCard
          headingLevel={1}
          icon={<CalendarClock aria-hidden="true" className="size-5" />}
          title={t('title')}
          text={t('text')}
        >
          <Link href="/team" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            {t('back')}
          </Link>
        </StateCard>
      )}
      {(result.kind === 'not-captain' || result.kind === 'not-found') && (
        <TeamAccessState kind={result.kind} />
      )}
    </PageMain>
  )
}
