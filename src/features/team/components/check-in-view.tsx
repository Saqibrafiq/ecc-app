'use client'

import { Ban, Check, Clock } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'

import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { Button } from '@/shared/ui/button'
import { StateCard } from '@/shared/ui/state-card'

import type { CheckIn, CheckInOutcome, CheckInPlayer, SaveCheckIn } from '../types'
import { ScreenHeader } from '@/shared/ui/screen-header'

export type CheckInViewProps = {
  checkIn: CheckIn
  isPreview: boolean
  /** Saves on the server; without it (the preview) the check-in stays in the page. */
  saveCheckIn?: SaveCheckIn
}

const POP = { type: 'spring', stiffness: 500, damping: 30 } as const

const ANSWER_CLASS = {
  going: 'bg-status-going-surface text-status-going-text',
  'not-going': 'bg-status-missed-surface text-status-missed-text',
  none: 'bg-surface-raised text-text-muted',
} as const

function PlayerCheck({
  player,
  isChecked,
  onToggle,
}: {
  player: CheckInPlayer
  isChecked: boolean
  onToggle: () => void
}) {
  const t = useTranslations('team.checkIn.answer')
  const answer = player.answer ?? 'none'
  return (
    <li>
      <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors duration-150 hover:bg-surface-raised">
        <input type="checkbox" checked={isChecked} onChange={onToggle} className="peer sr-only" />
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-lg border-2 border-border-strong transition-colors duration-150 peer-checked:border-accent-match peer-checked:bg-accent-match peer-focus-visible:ring-2 peer-focus-visible:ring-accent-match peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface-card"
        >
          <AnimatePresence initial={false}>
            {isChecked && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1, transition: POP }}
                exit={{ scale: 0 }}
                className="inline-flex text-text-on-accent"
              >
                <Check className="size-4" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="min-w-0 flex-1 font-semibold">{player.name}</span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
            ANSWER_CLASS[answer],
          )}
        >
          {t(answer)}
        </span>
      </label>
    </li>
  )
}

function PlayerGroup({
  id,
  title,
  players,
  present,
  onToggle,
}: {
  id: string
  title: string
  players: readonly CheckInPlayer[]
  present: ReadonlySet<string>
  onToggle: (id: string) => void
}) {
  if (players.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      <h3 id={id} className="px-3 text-xs font-bold tracking-wider text-text-muted uppercase">
        {title}
      </h3>
      <ul aria-labelledby={id} className="flex flex-col">
        {players.map((player) => (
          <PlayerCheck
            key={player.id}
            player={player}
            isChecked={present.has(player.id)}
            onToggle={() => {
              onToggle(player.id)
            }}
          />
        ))}
      </ul>
    </div>
  )
}

/** The captain ticks who came to practice and saves it (UC-6): walk-ins can be ticked too. */
export function CheckInView({ checkIn, isPreview, saveCheckIn }: CheckInViewProps) {
  const t = useTranslations('team')
  const format = useFormatter()
  const [present, setPresent] = useState(
    () => new Set(checkIn.players.filter((p) => p.isPresent).map((p) => p.id)),
  )
  const [outcome, setOutcome] = useState<CheckInOutcome | null>(null)
  const [isSaving, startSaving] = useTransition()

  const date = toDisplayDate(checkIn.practice.date)
  const dayName = format.dateTime(date, { weekday: 'long' })
  const header = (
    <ScreenHeader
      eyebrow={t('checkIn.eyebrow', {
        date: format.dateTime(date, { weekday: 'short', day: 'numeric', month: 'short' }),
      })}
      title={t('practice.title', { team: checkIn.practice.team.name })}
      back={{ href: '/team', label: t('back') }}
      previewNote={isPreview ? t('preview', { date: dayName }) : undefined}
    />
  )

  if (!checkIn.canCheckIn) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {checkIn.isCancelled ? (
          <StateCard
            icon={<Ban aria-hidden="true" className="size-5" />}
            title={t('checkIn.cancelledTitle')}
            text={t('checkIn.cancelledText')}
          />
        ) : (
          <StateCard
            icon={<Clock aria-hidden="true" className="size-5" />}
            title={t('checkIn.notYetTitle')}
            text={t('checkIn.notYetText', { day: dayName })}
          />
        )}
      </div>
    )
  }

  const toggle = (id: string) => {
    setOutcome(null)
    setPresent((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const save = () => {
    startSaving(async () => {
      if (!saveCheckIn) {
        setOutcome('saved')
        return
      }
      const { status } = await saveCheckIn({
        practiceId: checkIn.practiceId,
        presentIds: [...present],
      })
      setOutcome(status)
    })
  }
  const going = checkIn.players.filter((player) => player.answer === 'going')
  const others = checkIn.players.filter((player) => player.answer !== 'going')

  return (
    <div className="flex flex-col gap-6">
      {header}
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <fieldset className="flex flex-col gap-4 rounded-2xl border border-border-default bg-surface-card py-4">
          <legend className="sr-only">{t('checkIn.legend')}</legend>
          <p aria-hidden="true" className="px-4 font-display text-xl font-bold uppercase">
            {t('checkIn.legend')}
          </p>
          <PlayerGroup
            id="check-in-going"
            title={t('checkIn.going')}
            players={going}
            present={present}
            onToggle={toggle}
          />
          <PlayerGroup
            id="check-in-others"
            title={t('checkIn.others')}
            players={others}
            present={present}
            onToggle={toggle}
          />
          <p className="px-4 text-sm text-text-muted">{t('checkIn.walkIn')}</p>
        </fieldset>
        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border-default bg-surface-page/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
          {outcome === 'saved' && (
            <p role="status" className="text-sm font-medium text-status-going-text">
              {t('checkIn.saved')}
            </p>
          )}
          {outcome !== null && outcome !== 'saved' && (
            <p role="alert" className="text-sm font-medium text-status-missed-text">
              {outcome === 'not-yet'
                ? t('checkIn.notYetText', { day: dayName })
                : t('checkIn.failed')}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <span aria-live="polite" className="font-display text-lg font-bold uppercase">
              {t('checkIn.count', { count: present.size })}
            </span>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('checkIn.saving') : t('checkIn.save')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
