'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import { checkSquad, PLAYING_XI_SIZE, type SquadPick, TWELFTH_MEN } from '@/domain/club-rules'
import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { Button } from '@/shared/ui/button'

import { countRole, getNextRole, isPickable, togglePick } from '../domain/selection'
import type { SquadOutcome, SquadSelection, SquadStatus, SubmitSquad } from '../types'
import { CandidateRow } from './candidate-row'
import { ScreenHeader } from '@/shared/ui/screen-header'
import { TwelfthSheet } from './twelfth-sheet'

export type SquadSelectionViewProps = {
  selection: SquadSelection
  isPreview: boolean
  /** Submits on the server; without it (the preview) the squad stays in the page. */
  submitSquad?: SubmitSquad
}

const BANNER_CLASS: Record<Exclude<SquadStatus, 'open'>, string> = {
  submitted: 'border-accent-practice/40 text-accent-practice',
  returned: 'border-status-missed-text/40 bg-status-missed-surface text-status-missed-text',
  approved: 'border-status-going-text/40 bg-status-going-surface text-status-going-text',
}

/** A captain changes a squad only before handing it in, or after the Board returned it. */
const EDITABLE_STATUSES: readonly SquadStatus[] = ['open', 'returned']

function Counter({ label, value, of }: { label: string; value: number; of?: number }) {
  const isDone = of !== undefined && value === of
  return (
    <span className="flex flex-col items-center">
      <span
        className={cn(
          'font-display text-2xl leading-none font-bold tabular-nums',
          isDone ? 'text-accent-match' : 'text-text-default',
        )}
      >
        {of === undefined ? value : `${String(value)}/${String(of)}`}
      </span>
      <span className="text-xs font-bold tracking-wide text-text-muted uppercase">{label}</span>
    </span>
  )
}

function StatusBanner({ status, note }: { status: SquadStatus; note: string | null }) {
  const t = useTranslations('team.squad.banner')
  if (status === 'open') return null
  let text = t(status)
  if (status === 'returned') text = note ? t('returned', { note }) : t('returnedNoNote')
  // A live region: submitting announces the new state.
  return (
    <p
      role="status"
      className={cn('rounded-xl border px-4 py-3 text-sm font-medium', BANNER_CLASS[status])}
    >
      {text}
    </p>
  )
}

/**
 * The captain picks the squad from the players who said Going (UC-9): nothing is preselected;
 * taps fill the XI, a sheet asks for the 12th man once it is full, further taps add reserves.
 * Once submitted the squad is the Board's: only they can reopen it.
 */
export function SquadSelectionView({ selection, isPreview, submitSquad }: SquadSelectionViewProps) {
  const t = useTranslations('team')
  const format = useFormatter()
  const [picks, setPicks] = useState<SquadPick[]>(selection.picks)
  const [status, setStatus] = useState(selection.status)
  const [outcome, setOutcome] = useState<SquadOutcome | null>(null)
  const [isSheetOpen, setSheetOpen] = useState(false)
  const [isSubmitting, startSubmitting] = useTransition()

  const { match, candidates } = selection
  const isLocked = !EDITABLE_STATUSES.includes(status)
  const isComplete = checkSquad({ picks, carryOvers: [], notGoing: new Set() }).isValid
  const pickOf = new Map(picks.map((pick) => [pick.playerId, pick]))
  const xi = picks.filter((pick) => pick.role === 'playing').map((pick) => pick.playerId)
  const free = candidates.filter((c) => isPickable(c) && !pickOf.has(c.id))
  const date = toDisplayDate(match.date)

  const tap = (playerId: string) => {
    const next = togglePick(picks, playerId)
    setPicks(next)
    setOutcome(null)
    const hasFilledXI =
      next.length > picks.length &&
      countRole(next, 'playing') === PLAYING_XI_SIZE &&
      countRole(picks, 'playing') < PLAYING_XI_SIZE &&
      countRole(next, 'twelfth') < TWELFTH_MEN
    if (hasFilledXI) setSheetOpen(true)
  }
  const pickTwelfth = (playerId: string) => {
    setPicks((current) => togglePick(current, playerId))
    setSheetOpen(false)
  }
  const submit = () => {
    startSubmitting(async () => {
      const result = submitSquad
        ? await submitSquad({ fixtureId: selection.fixtureId, picks })
        : { status: 'submitted' as const }
      setOutcome(result.status)
      if (result.status === 'submitted' || result.status === 'locked') setStatus('submitted')
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        eyebrow={t('squad.eyebrow', {
          date: format.dateTime(date, { weekday: 'short', day: 'numeric', month: 'short' }),
        })}
        title={t('match.title', { opponent: match.opponent ?? '' })}
        back={{ href: '/team', label: t('back') }}
        previewNote={
          isPreview ? t('preview', { date: format.dateTime(date, { weekday: 'long' }) }) : undefined
        }
      >
        <p className="text-sm text-text-muted">
          {t('squad.summary', {
            going: candidates.length,
            notGoing: selection.notGoing,
            awaiting: selection.awaiting,
          })}
        </p>
      </ScreenHeader>

      <StatusBanner status={status} note={selection.note} />

      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-border-default bg-surface-page/95 px-4 py-3 backdrop-blur">
        <div className="grid grid-cols-3">
          <Counter label={t('squad.counter.xi')} value={xi.length} of={PLAYING_XI_SIZE} />
          <Counter
            label={t('squad.counter.twelfth')}
            value={countRole(picks, 'twelfth')}
            of={TWELFTH_MEN}
          />
          <Counter label={t('squad.counter.reserves')} value={countRole(picks, 'reserve')} />
        </div>
        {!isLocked && (
          <p aria-live="polite" className="text-center text-sm text-text-muted">
            {t(`squad.hint.${getNextRole(picks)}`)}
          </p>
        )}
      </div>

      <section aria-labelledby="squad-candidates" className="flex flex-col gap-2">
        <h2 id="squad-candidates" className="font-display text-xl font-bold uppercase">
          {t('squad.list')}
        </h2>
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => {
            const position = xi.indexOf(candidate.id)
            return (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                pick={pickOf.get(candidate.id)}
                position={position === -1 ? undefined : position + 1}
                isDisabled={isLocked || !isPickable(candidate)}
                onToggle={() => {
                  tap(candidate.id)
                }}
              />
            )
          })}
        </ul>
      </section>

      {!isLocked && (
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border-default bg-surface-page/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          {outcome !== null && outcome !== 'submitted' && (
            <p role="alert" className="text-sm font-medium text-status-missed-text">
              {t(`squad.errors.${outcome}`)}
            </p>
          )}
          {!isComplete && <p className="text-sm text-text-muted">{t('squad.incomplete')}</p>}
          <Button
            size="lg"
            disabled={!isComplete || isSubmitting}
            onClick={submit}
            className="w-full"
          >
            {isSubmitting ? t('squad.submitting') : t('squad.submit')}
          </Button>
        </div>
      )}

      <TwelfthSheet
        open={isSheetOpen}
        onOpenChange={setSheetOpen}
        candidates={free}
        onPick={pickTwelfth}
      />
    </div>
  )
}
