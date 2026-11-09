import { Link2Off, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { ScreenHeader } from '@/shared/ui/screen-header'
import { StateCard } from '@/shared/ui/state-card'

import type { LedgerResult } from '../server/queries'
import type { RequestCorrection } from '../types'
import { PracticeLedger } from './practice-ledger'
import { StandingCard } from './standing-card'
import { TargetCard } from './target-card'

export type AttendanceViewProps = {
  result: Exclude<LedgerResult, { kind: 'signed-out' }>
  requestCorrection?: RequestCorrection
}

/** The member's season as a ledger (UC-7, UC-20): standing, targets, every practice. */
export function AttendanceView({ result, requestCorrection }: AttendanceViewProps) {
  const t = useTranslations('attendance')
  const tState = useTranslations('weekState')

  if (result.kind === 'unlinked') {
    return (
      <StateCard
        headingLevel={1}
        icon={<Link2Off aria-hidden="true" className="size-5" />}
        title={tState('unlinked.title')}
        text={tState('unlinked.text')}
      />
    )
  }
  if (result.kind === 'no-squad') {
    return (
      <StateCard
        headingLevel={1}
        icon={<Users aria-hidden="true" className="size-5" />}
        title={tState('noSquad.title')}
        text={tState('noSquad.text')}
      />
    )
  }

  const { ledger, isPreview } = result
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        eyebrow={t('eyebrow', { team: ledger.team.name, season: ledger.season })}
        title={t('title')}
        previewNote={isPreview ? t('preview') : undefined}
      />
      <StandingCard standing={ledger.standing} />
      <TargetCard targets={ledger.targets} />
      <PracticeLedger months={ledger.months} requestCorrection={requestCorrection} />
    </div>
  )
}
