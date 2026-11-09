'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/cn'

import type { LedgerTarget } from '../types'

export type TargetCardProps = {
  targets: readonly LedgerTarget[]
}

const PERCENT = 100
const GROW = { type: 'spring', stiffness: 120, damping: 22 } as const

const STANDING_CLASS = {
  met: 'bg-status-attended',
  'on-track': 'bg-accent-practice',
  missed: 'bg-status-missed-text',
} as const

/** The member's availability targets for the season (R-15, motions 2023/05 and 2023/06). */
export function TargetCard({ targets }: TargetCardProps) {
  const t = useTranslations('attendance.targets')

  return (
    <section
      aria-labelledby="targets-heading"
      className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-card p-4"
    >
      <h2
        id="targets-heading"
        className="font-display text-sm font-bold tracking-[0.15em] text-text-muted uppercase"
      >
        {t('title')}
      </h2>
      <ul className="flex flex-col gap-4">
        {targets.map((target) => {
          const progress =
            target.required === 0 ? 1 : Math.min(1, target.available / target.required)
          let message = t('missed')
          if (target.standing === 'met') message = t('met')
          else if (target.standing === 'on-track') {
            message = t('onTrack', { needed: target.stillNeeded, upcoming: target.upcoming })
          }
          return (
            <li key={target.kind} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{t(target.kind)}</span>
                <span className="text-sm text-text-muted tabular-nums">
                  {t('count', { available: target.available, required: target.required })}
                </span>
              </div>
              <div
                role="meter"
                aria-label={t(target.kind)}
                aria-valuemin={0}
                aria-valuemax={target.required}
                aria-valuenow={Math.min(target.available, target.required)}
                className="h-2.5 overflow-hidden rounded-full bg-surface-raised"
              >
                <motion.div
                  className={cn('h-full rounded-full', STANDING_CLASS[target.standing])}
                  initial={{ width: 0 }}
                  animate={{ width: `${String(progress * PERCENT)}%` }}
                  transition={GROW}
                />
              </div>
              <span className="text-sm text-text-muted">
                {message}{' '}
                <span className="text-xs">
                  ({t('motion', { motion: target.motion, share: target.share * PERCENT })})
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
