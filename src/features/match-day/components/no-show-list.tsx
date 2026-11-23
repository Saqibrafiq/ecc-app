'use client'

import { UserX } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/button'

import type { MatchDayPlayer, NoShowsOutcome, RecordNoShows } from '../types'

export type NoShowListProps = {
  fixtureId: number
  players: readonly MatchDayPlayer[]
  noShowIds: readonly string[]
  recordedAt: string | null
  canRecord: boolean
  /** Records on the server; without it (the preview) the marks stay in the page. */
  recordNoShows?: RecordNoShows
}

const POP = { type: 'spring', stiffness: 500, damping: 30 } as const

/**
 * The captain marks who was selected but did not appear (UC-19). Nobody is marked to begin with;
 * saving with nobody marked records that everyone appeared (R-14, motion 2023/10).
 */
export function NoShowList({
  fixtureId,
  players,
  noShowIds,
  recordedAt,
  canRecord,
  recordNoShows,
}: NoShowListProps) {
  const t = useTranslations('matchDay.noShows')
  const format = useFormatter()
  const [absent, setAbsent] = useState<ReadonlySet<string>>(() => new Set(noShowIds))
  const [lastRecorded, setLastRecorded] = useState(recordedAt)
  const [outcome, setOutcome] = useState<NoShowsOutcome | null>(null)
  const [isSaving, startSaving] = useTransition()

  if (!canRecord) return <p className="text-sm text-text-muted">{t('notYet')}</p>

  const toggle = (playerId: string) => {
    setOutcome(null)
    setAbsent((current) => {
      const next = new Set(current)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }
  const save = () => {
    startSaving(async () => {
      const noShows = [...absent]
      const status = recordNoShows
        ? (await recordNoShows({ fixtureId, noShowIds: noShows })).status
        : 'saved'
      setOutcome(status)
      if (status === 'saved') setLastRecorded(new Date().toISOString())
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4">
      <p className="text-sm text-text-muted">{t('text')}</p>
      <ul className="flex flex-col divide-y divide-border-default">
        {players.map((player) => {
          const isAbsent = absent.has(player.playerId)
          return (
            <li key={player.playerId} className="flex min-h-14 items-center gap-3 py-2">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('font-semibold', isAbsent && 'text-status-missed-text')}>
                  {player.name}
                </span>
                <AnimatePresence initial={false}>
                  {isAbsent && (
                    <motion.span
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden text-xs text-text-muted"
                    >
                      {t('sitsOut')}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <Button
                variant={isAbsent ? 'primary' : 'outline'}
                aria-pressed={isAbsent}
                aria-label={t(isAbsent ? 'markPresent' : 'markAbsent', { name: player.name })}
                disabled={isSaving}
                onClick={() => {
                  toggle(player.playerId)
                }}
                className={cn(
                  'shrink-0 px-3 text-base',
                  isAbsent &&
                    'bg-status-missed-surface text-status-missed-text hover:bg-status-missed-surface',
                )}
              >
                <AnimatePresence initial={false}>
                  {isAbsent && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, transition: POP }}
                      exit={{ scale: 0 }}
                      className="inline-flex"
                    >
                      <UserX aria-hidden="true" className="size-4" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
                {t('absent')}
              </Button>
            </li>
          )
        })}
      </ul>
      {outcome === 'saved' && (
        <p role="status" className="text-sm font-medium text-status-going-text">
          {t('saved', { count: absent.size })}
        </p>
      )}
      {outcome !== null && outcome !== 'saved' && (
        <p role="alert" className="text-sm font-medium text-status-missed-text">
          {t(`errors.${outcome}`)}
        </p>
      )}
      {lastRecorded && outcome === null && (
        <p className="text-sm text-text-muted">
          {t('recordedAt', {
            date: format.dateTime(new Date(lastRecorded), {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
              hourCycle: 'h23',
            }),
          })}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span aria-live="polite" className="font-display text-lg font-bold uppercase">
          {t('count', { count: absent.size })}
        </span>
        <Button disabled={isSaving} onClick={save}>
          {isSaving ? t('saving') : t('save')}
        </Button>
      </div>
    </div>
  )
}
