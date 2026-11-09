'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { Button } from '@/shared/ui/button'
import { NoteSheet } from '@/shared/ui/note-sheet'
import { OutcomeMark } from '@/shared/ui/outcome-mark'

import { CORRECTION_NOTE_MAX_LENGTH } from '../domain/correction'
import type { CorrectionOutcome, LedgerMonth, LedgerPractice, RequestCorrection } from '../types'

export type PracticeLedgerProps = {
  months: readonly LedgerMonth[]
  /** Sends a request on the server; without it (the preview) the request stays in the page. */
  requestCorrection?: RequestCorrection
}

const FIRST_OF_MONTH = '-01'
const CORRECTION_CLASS = {
  requested: 'text-accent-practice',
  accepted: 'text-status-going-text',
  declined: 'text-status-missed-text',
} as const

/** Every practice of the season by month; a missed one can be corrected on request (UC-18). */
export function PracticeLedger({ months, requestCorrection }: PracticeLedgerProps) {
  const t = useTranslations('attendance')
  const format = useFormatter()
  const [requested, setRequested] = useState<ReadonlySet<number>>(new Set())
  const [asking, setAsking] = useState<LedgerPractice | null>(null)
  const [outcome, setOutcome] = useState<CorrectionOutcome | null>(null)
  const [isPending, startTransition] = useTransition()

  const dayOf = (practice: LedgerPractice) =>
    format.dateTime(toDisplayDate(practice.date), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })

  const send = (practice: LedgerPractice, note: string) => {
    setAsking(null)
    startTransition(async () => {
      const status = requestCorrection
        ? (await requestCorrection({ practiceId: practice.practiceId, note })).status
        : 'requested'
      setOutcome(status)
      if (status === 'requested') {
        setRequested((current) => new Set([...current, practice.practiceId]))
      }
    })
  }

  return (
    <section aria-labelledby="practices-heading" className="flex flex-col gap-3">
      <h2 id="practices-heading" className="font-display text-xl font-bold uppercase">
        {t('practices.title')}
      </h2>
      {outcome !== null && (
        <p
          role={outcome === 'requested' ? 'status' : 'alert'}
          className={cn(
            'text-sm font-medium',
            outcome === 'requested' ? 'text-status-going-text' : 'text-status-missed-text',
          )}
        >
          {outcome === 'requested' ? t('correction.sent') : t('correction.failed')}
        </p>
      )}
      {months.length === 0 && <p className="text-text-muted">{t('practices.empty')}</p>}
      {months.map((month) => (
        <div key={month.month} className="flex flex-col gap-1">
          <h3 className="text-xs font-bold tracking-wider text-text-muted uppercase">
            {format.dateTime(
              toDisplayDate(`${month.month}${FIRST_OF_MONTH}` as LedgerPractice['date']),
              {
                month: 'long',
                year: 'numeric',
              },
            )}
          </h3>
          <ul className="flex flex-col divide-y divide-border-default rounded-2xl border border-border-default bg-surface-card px-4">
            {month.practices.map((practice) => {
              const correction = requested.has(practice.practiceId)
                ? 'requested'
                : practice.correction
              const canAsk = practice.canRequestCorrection && correction === null
              return (
                <li key={practice.practiceId} className="flex min-h-16 items-center gap-3 py-2">
                  <OutcomeMark
                    outcome={practice.outcome}
                    label={t(`outcome.${practice.outcome}`)}
                    size="sm"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={cn(
                        'font-semibold',
                        practice.outcome === 'cancelled' && 'text-text-muted line-through',
                      )}
                    >
                      {dayOf(practice)}
                    </span>
                    <span className="text-sm text-text-muted">
                      {t(`outcome.${practice.outcome}`)}
                    </span>
                    <AnimatePresence initial={false}>
                      {correction && (
                        <motion.span
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className={cn('text-sm font-medium', CORRECTION_CLASS[correction])}
                        >
                          {t(`correction.${correction}`)}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  {canAsk && (
                    <Button
                      variant="outline"
                      disabled={isPending}
                      aria-label={t('correction.askFor', { date: dayOf(practice) })}
                      onClick={() => {
                        setAsking(practice)
                      }}
                      className="shrink-0 px-3 text-base"
                    >
                      {t('correction.ask')}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <NoteSheet
        key={asking?.practiceId ?? 'closed'}
        open={asking !== null}
        title={t('correction.sheet.title')}
        description={t('correction.sheet.description')}
        closeLabel={t('correction.sheet.close')}
        label={t('correction.sheet.label')}
        placeholder={t('correction.sheet.placeholder')}
        maxLength={CORRECTION_NOTE_MAX_LENGTH}
        requiredMessage={t('correction.sheet.required')}
        tooLongMessage={t('correction.sheet.tooLong', { max: CORRECTION_NOTE_MAX_LENGTH })}
        submitLabel={t('correction.sheet.send')}
        cancelLabel={t('correction.sheet.cancel')}
        onClose={() => {
          setAsking(null)
        }}
        onSubmit={(note) => {
          if (asking) send(asking, note)
        }}
      />
    </section>
  )
}
