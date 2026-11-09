'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import { toDisplayDate } from '@/shared/lib/display-date'
import { Button } from '@/shared/ui/button'

import type { DecideCorrection, TeamCorrection } from '../types'

export type CorrectionRequestsProps = {
  corrections: readonly TeamCorrection[]
  /** Decides on the server; without it (the preview) the decision stays in the page. */
  decideCorrection?: DecideCorrection
}

const EXIT = { opacity: 0, height: 0, transition: { duration: 0.18 } } as const

/** Players asking to be marked present at a practice (UC-18): the captain accepts or declines. */
export function CorrectionRequests({ corrections, decideCorrection }: CorrectionRequestsProps) {
  const t = useTranslations('team.corrections')
  const format = useFormatter()
  const [open, setOpen] = useState(corrections)
  const [hasFailed, setFailed] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (corrections.length === 0) return null

  const decide = (correction: TeamCorrection, isAccepted: boolean) => {
    startTransition(async () => {
      const status = decideCorrection
        ? (await decideCorrection({ correctionId: correction.id, isAccepted })).status
        : 'decided'
      setFailed(status !== 'decided')
      if (status === 'decided') {
        setOpen((current) => current.filter((entry) => entry.id !== correction.id))
      }
    })
  }

  return (
    <section aria-labelledby="team-corrections" className="flex flex-col gap-3">
      <h2 id="team-corrections" className="font-display text-xl font-bold uppercase">
        {t('title')}
      </h2>
      {hasFailed && (
        <p role="alert" className="text-sm font-medium text-status-missed-text">
          {t('failed')}
        </p>
      )}
      {open.length === 0 ? (
        <p role="status" className="text-sm text-text-muted">
          {t('done')}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {open.map((correction) => (
              <motion.li
                key={correction.id}
                exit={EXIT}
                className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-border-default bg-surface-card p-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">{correction.playerName}</span>
                  <span className="text-sm text-text-muted">
                    {t('practiceOn', {
                      date: format.dateTime(toDisplayDate(correction.practiceDate), {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      }),
                    })}
                  </span>
                  {correction.note && <q className="text-sm">{correction.note}</q>}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    variant="outline"
                    disabled={isPending}
                    aria-label={t('declineFor', { name: correction.playerName })}
                    onClick={() => {
                      decide(correction, false)
                    }}
                  >
                    {t('decline')}
                  </Button>
                  <Button
                    disabled={isPending}
                    aria-label={t('acceptFor', { name: correction.playerName })}
                    onClick={() => {
                      decide(correction, true)
                    }}
                  >
                    {t('accept')}
                  </Button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
