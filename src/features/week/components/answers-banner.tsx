'use client'

import { CircleCheck } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'

export type AnswersBannerProps = {
  count: number
  /** Short names of the events still to answer, e.g. "Saturday's match". */
  events: readonly string[]
}

const SWAP = { duration: 0.16 } as const

/** How many answers the member still owes this week, or a calm "all answered". */
export function AnswersBanner({ count, events }: AnswersBannerProps) {
  const t = useTranslations('week.banner')

  return (
    <section aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait" initial={false}>
        {count > 0 ? (
          <motion.div
            key="needed"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SWAP}
            className="flex items-center gap-3 rounded-2xl bg-accent-match px-4 py-3 text-text-on-accent"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={count}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={SWAP}
                className="font-display text-4xl leading-none font-bold tabular-nums"
              >
                {count}
              </motion.span>
            </AnimatePresence>
            <span className="flex flex-col">
              <span className="font-bold">{t('needed', { count })}</span>
              <span className="text-sm">{t('which', { events: events.join(' · ') })}</span>
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SWAP}
            className="flex items-center gap-3 rounded-2xl border border-status-going-surface bg-status-going-surface/40 px-4 py-3"
          >
            <CircleCheck aria-hidden="true" className="size-7 text-status-going-text" />
            <span className="flex flex-col">
              <span className="font-bold text-status-going-text">{t('allDone')}</span>
              <span className="text-sm text-text-muted">{t('allDoneText')}</span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
