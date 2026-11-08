'use client'

import { Check } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import { type DeadlineDay, getAvailabilityDeadline } from '@/domain/club-rules'
import type { SquadStatus } from '@/features/team'
import { useRouter } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { Button } from '@/shared/ui/button'
import { NoteSheet } from '@/shared/ui/note-sheet'
import { ScreenHeader } from '@/shared/ui/screen-header'

import {
  canApprove,
  canChangeRules,
  canSendBack,
  NOTE_MAX_LENGTH,
  toggleException,
} from '../domain/board'
import type { BoardActions, BoardOutcome, BoardSquad } from '../types'
import { STATUS_CLASS } from './status'

export type BoardSquadViewProps = {
  squad: BoardSquad
  isPreview: boolean
  /** The Board's decisions on the server; without them (the preview) they stay in the page. */
  actions?: BoardActions
}

type Decision = 'approve' | 'sendBack' | 'deadline' | 'exception'
type Feedback = { decision: Decision; outcome: BoardOutcome } | null

const DEADLINE_DAYS: readonly DeadlineDay[] = ['tuesday', 'wednesday', 'thursday']
const POP = { type: 'spring', stiffness: 500, damping: 30 } as const
const SECTION_CLASS =
  'flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4'
const SECTION_TITLE_CLASS = 'font-display text-xl font-bold uppercase'

function SquadList({ squad }: { squad: BoardSquad['squad'] }) {
  const t = useTranslations('board.squad')
  if (squad.length === 0) return <p className="text-text-muted">{t('empty')}</p>
  // The list is in squad order: the XI first, so a player's position is their index.
  return (
    <ol className="flex flex-col divide-y divide-border-default">
      {squad.map((pick, index) => {
        const mark =
          pick.role === 'playing' ? String(index + 1) : pick.role === 'twelfth' ? '12' : 'R'
        return (
          <li key={pick.playerId} className="flex min-h-11 items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-raised font-display font-bold tabular-nums"
            >
              {mark}
            </span>
            <span className="flex-1 font-semibold">{pick.name}</span>
            {pick.role !== 'playing' && (
              <span className="text-xs font-bold tracking-wide text-accent-match uppercase">
                {t(pick.role)}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * The Board reviews one match's squad (UC-10, UC-11, UC-14): approve and announce it, send it back
 * to the captain with a note, extend the answer deadline, allow exceptions. It never edits picks.
 */
export function BoardSquadView({ squad, isPreview, actions }: BoardSquadViewProps) {
  const t = useTranslations('board')
  const tReason = useTranslations('team.squad.reason')
  const format = useFormatter()
  const router = useRouter()
  const [status, setStatus] = useState<SquadStatus>(squad.selection.status)
  const [note, setNote] = useState(squad.selection.note)
  const [deadlineDay, setDeadlineDay] = useState(squad.deadlineDay)
  const [exceptionIds, setExceptionIds] = useState(squad.exceptionIds)
  const [isSheetOpen, setSheetOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isPending, startTransition] = useTransition()

  const { match } = squad.selection
  const date = toDisplayDate(match.date)
  const closesAt = getAvailabilityDeadline(match.date, deadlineDay)

  /** Runs a decision on the server (or only here, in the preview), then shows how it went. */
  const run = (
    decision: Decision,
    send: ((actions: BoardActions) => Promise<{ status: BoardOutcome }>) | null,
    apply: () => void,
  ) => {
    startTransition(async () => {
      const outcome = actions && send ? (await send(actions)).status : 'saved'
      setFeedback({ decision, outcome })
      if (outcome !== 'saved') return
      apply()
      if (actions) router.refresh()
    })
  }
  const fixtureId = squad.selection.fixtureId

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        eyebrow={t('squad.eyebrow', {
          team: match.team.name,
          date: format.dateTime(date, { weekday: 'short', day: 'numeric', month: 'short' }),
        })}
        title={t('match.title', { team: match.team.name, opponent: match.opponent ?? '' })}
        back={{ href: '/board', label: t('back') }}
        previewNote={
          isPreview ? t('preview', { date: format.dateTime(date, { weekday: 'long' }) }) : undefined
        }
      >
        <p className={cn('text-sm font-semibold', STATUS_CLASS[status])}>{t(`status.${status}`)}</p>
        <p className="text-sm text-text-muted">
          {t('squad.summary', {
            going: squad.selection.candidates.length,
            notGoing: squad.selection.notGoing,
            awaiting: squad.selection.awaiting,
          })}
        </p>
      </ScreenHeader>

      {feedback && (
        <p
          role={feedback.outcome === 'saved' ? 'status' : 'alert'}
          className={cn(
            'rounded-xl border px-4 py-3 text-sm font-medium',
            feedback.outcome === 'saved'
              ? 'border-status-going-text/40 bg-status-going-surface text-status-going-text'
              : 'border-status-missed-text/40 bg-status-missed-surface text-status-missed-text',
          )}
        >
          {feedback.outcome === 'saved'
            ? t(`saved.${feedback.decision}`)
            : t(`errors.${feedback.outcome}`)}
        </p>
      )}

      <section aria-labelledby="board-squad" className={SECTION_CLASS}>
        <h2 id="board-squad" className={SECTION_TITLE_CLASS}>
          {t('squad.title')}
        </h2>
        <SquadList squad={squad.squad} />
        {status === 'returned' && note && (
          <p className="text-sm text-text-muted">{t('squad.returnedNote', { note })}</p>
        )}
        {(canApprove(status) || canSendBack(status)) && (
          <div className="flex flex-col gap-2.5 pt-1">
            {canApprove(status) && (
              <Button
                size="lg"
                disabled={isPending}
                onClick={() => {
                  run(
                    'approve',
                    (a) => a.approve({ fixtureId }),
                    () => {
                      setStatus('approved')
                    },
                  )
                }}
              >
                {isPending ? t('decide.approving') : t('decide.approve')}
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setSheetOpen(true)
              }}
            >
              {status === 'approved' ? t('decide.reopen') : t('decide.sendBack')}
            </Button>
          </div>
        )}
      </section>

      {canChangeRules(status) && (
        <section aria-labelledby="board-deadline" className={SECTION_CLASS}>
          <h2 id="board-deadline" className={SECTION_TITLE_CLASS}>
            {t('deadline.title')}
          </h2>
          <p className="text-sm text-text-muted">
            {t('deadline.hint', {
              when: format.dateTime(closesAt, {
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
              }),
            })}
          </p>
          <div role="group" aria-label={t('deadline.title')} className="grid grid-cols-3 gap-2">
            {DEADLINE_DAYS.map((day) => (
              <Button
                key={day}
                variant={day === deadlineDay ? 'primary' : 'outline'}
                aria-pressed={day === deadlineDay}
                disabled={isPending}
                onClick={() => {
                  if (day === deadlineDay) return
                  run(
                    'deadline',
                    (a) => a.setDeadline({ fixtureId, deadlineDay: day }),
                    () => {
                      setDeadlineDay(day)
                    },
                  )
                }}
                className="px-2 text-base"
              >
                {t(`deadline.${day}`)}
              </Button>
            ))}
          </div>
        </section>
      )}

      {canChangeRules(status) && squad.blocked.length > 0 && (
        <section aria-labelledby="board-exceptions" className={SECTION_CLASS}>
          <h2 id="board-exceptions" className={SECTION_TITLE_CLASS}>
            {t('exceptions.title')}
          </h2>
          <p className="text-sm text-text-muted">{t('exceptions.hint')}</p>
          <ul className="flex flex-col divide-y divide-border-default">
            {squad.blocked.map((candidate) => {
              const isAllowed = exceptionIds.includes(candidate.id)
              return (
                <li key={candidate.id} className="flex min-h-14 items-center gap-3 py-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{candidate.name}</span>
                    <span className="text-xs text-status-missed-text">
                      {candidate.eligibility.reasons.map((reason) => tReason(reason)).join(' · ')}
                    </span>
                  </span>
                  <Button
                    variant={isAllowed ? 'primary' : 'outline'}
                    aria-pressed={isAllowed}
                    aria-label={`${isAllowed ? t('exceptions.allowed') : t('exceptions.allow')}: ${candidate.name}`}
                    disabled={isPending}
                    onClick={() => {
                      run(
                        'exception',
                        (a) =>
                          a.setException({
                            fixtureId,
                            playerId: candidate.id,
                            isAllowed: !isAllowed,
                          }),
                        () => {
                          setExceptionIds((ids) => toggleException(ids, candidate.id, !isAllowed))
                        },
                      )
                    }}
                    className="shrink-0 text-base"
                  >
                    <AnimatePresence initial={false}>
                      {isAllowed && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, transition: POP }}
                          exit={{ scale: 0 }}
                          className="inline-flex"
                        >
                          <Check aria-hidden="true" className="size-4" strokeWidth={3} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isAllowed ? t('exceptions.allowed') : t('exceptions.allow')}
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <NoteSheet
        open={isSheetOpen}
        title={t('sendBackSheet.title')}
        description={t('sendBackSheet.description')}
        closeLabel={t('sendBackSheet.close')}
        label={t('sendBackSheet.label')}
        placeholder={t('sendBackSheet.placeholder')}
        maxLength={NOTE_MAX_LENGTH}
        requiredMessage={t('sendBackSheet.required')}
        tooLongMessage={t('sendBackSheet.tooLong', { max: NOTE_MAX_LENGTH })}
        submitLabel={t('sendBackSheet.send')}
        cancelLabel={t('sendBackSheet.cancel')}
        onClose={() => {
          setSheetOpen(false)
        }}
        onSubmit={(text) => {
          setSheetOpen(false)
          run(
            'sendBack',
            (a) => a.sendBack({ fixtureId, note: text }),
            () => {
              setStatus('returned')
              setNote(text)
            },
          )
        }}
      />
    </div>
  )
}
