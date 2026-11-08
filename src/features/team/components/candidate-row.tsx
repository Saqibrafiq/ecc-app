'use client'

import { Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import type { SquadPick } from '@/domain/club-rules'
import { cn } from '@/shared/lib/cn'

import type { Candidate } from '../types'

export type CandidateRowProps = {
  candidate: Candidate
  pick: SquadPick | undefined
  /** 1–11 for a player in the XI. */
  position: number | undefined
  isDisabled: boolean
  onToggle: () => void
}

const POP = { type: 'spring', stiffness: 500, damping: 30 } as const

function Mark({ pick, position }: { pick: SquadPick | undefined; position: number | undefined }) {
  let label = ''
  if (pick?.role === 'playing') label = String(position ?? '')
  else if (pick?.role === 'twelfth') label = '12'
  else if (pick?.role === 'reserve') label = 'R'

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-display text-lg font-bold tabular-nums transition-colors duration-150',
        pick ? 'border-accent-match bg-accent-match text-text-on-accent' : 'border-border-strong',
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {pick ? (
          <motion.span key={label} initial={{ scale: 0 }} animate={{ scale: 1, transition: POP }}>
            {label}
          </motion.span>
        ) : (
          <motion.span key="add" initial={{ scale: 0 }} animate={{ scale: 1, transition: POP }}>
            <Plus className="size-4 text-text-muted" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

/** One going player in the selection: tap to pick or drop; why not, if they can't be picked. */
export function CandidateRow({
  candidate,
  pick,
  position,
  isDisabled,
  onToggle,
}: CandidateRowProps) {
  const t = useTranslations('team.squad')
  const { eligibility, attendance } = candidate
  const isBlocked = eligibility.verdict === 'not-selectable'

  const details: string[] = []
  if (candidate.isCarriedOver) details.push(t('carriedOver'))
  if (isBlocked) details.push(...eligibility.reasons.map((reason) => t(`reason.${reason}`)))
  else if (eligibility.verdict === 'conditional') details.push(t('conditional'))
  if (attendance.isRuleActive && !isBlocked) {
    details.push(t('practices', { attended: attendance.attended, required: attendance.required }))
  }

  return (
    <li>
      <motion.button
        type="button"
        layout="position"
        aria-pressed={pick !== undefined}
        disabled={isDisabled}
        onClick={onToggle}
        className={cn(
          'flex min-h-16 w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors duration-150',
          pick
            ? 'border-accent-match bg-accent-match/10'
            : 'border-border-default bg-surface-card hover:bg-surface-raised',
          isDisabled && !pick && 'cursor-not-allowed opacity-60 hover:bg-surface-card',
          isDisabled && pick && 'cursor-default',
        )}
      >
        <Mark pick={pick} position={position} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-semibold">{candidate.name}</span>
          {details.length > 0 && (
            <span
              className={cn(
                'text-xs',
                isBlocked ? 'text-status-missed-text' : 'text-text-muted',
                eligibility.verdict === 'conditional' && 'text-accent-practice',
              )}
            >
              {details.join(' · ')}
            </span>
          )}
        </span>
        {pick && (
          <span className="shrink-0 text-xs font-bold tracking-wide text-accent-match uppercase">
            {t(`role.${pick.role}`)}
          </span>
        )}
      </motion.button>
    </li>
  )
}
