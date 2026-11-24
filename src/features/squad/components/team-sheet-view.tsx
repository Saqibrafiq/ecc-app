'use client'

import { motion } from 'motion/react'
import { useFormatter, useTranslations } from 'next-intl'

import type { SquadRole } from '@/domain/club-rules'
import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { ScreenHeader } from '@/shared/ui/screen-header'

import type { SheetPlayer, TeamSheet } from '../types'

export type TeamSheetViewProps = {
  sheet: TeamSheet
  isPreview: boolean
}

const SECTIONS: { role: SquadRole; key: 'xi' | 'twelfth' | 'reserves' }[] = [
  { role: 'playing', key: 'xi' },
  { role: 'twelfth', key: 'twelfth' },
  { role: 'reserve', key: 'reserves' },
]
/** Rows settle in one after another, quickly: the whole sheet is there within 200 ms. */
const ROW_STAGGER_SECONDS = 0.012
const ROW_DURATION_SECONDS = 0.15

type RowProps = { player: SheetPlayer; number: number | null; index: number }

function SheetRow({ player, number, index }: RowProps) {
  const t = useTranslations('squad')
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ROW_DURATION_SECONDS, delay: index * ROW_STAGGER_SECONDS }}
      className={cn(
        'flex min-h-12 items-center gap-3 px-4 py-2.5',
        player.isViewer && 'bg-accent-match font-semibold text-text-on-accent',
      )}
    >
      <span
        className={cn(
          'w-6 shrink-0 text-right font-display text-lg font-bold tabular-nums',
          !player.isViewer && 'text-text-muted',
        )}
      >
        {number}
      </span>
      <span className="min-w-0 flex-1 truncate">{player.name || t('unnamed')}</span>
      {player.isViewer && (
        <span className="shrink-0 rounded-full border border-current px-2 py-0.5 font-display text-xs font-bold tracking-wider uppercase">
          {t('you')}
        </span>
      )}
    </motion.li>
  )
}

/**
 * The announced squad as every member sees it (UC-12): the match, then the playing XI, the 12th
 * man and any reserves in sheet order (R-17), the member's own row picked out in match gold.
 */
export function TeamSheetView({ sheet, isPreview }: TeamSheetViewProps) {
  const t = useTranslations('squad')
  const format = useFormatter()
  const { match, players } = sheet
  const viewer = players.find((player) => player.isViewer)
  const date = format.dateTime(toDisplayDate(match.date), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  const place = [match.isHome ? t('home') : t('away'), match.ground, match.startTime]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex flex-col gap-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <ScreenHeader
        eyebrow={t('eyebrow', { date, team: match.team.name })}
        title={t('title', { opponent: match.opponent ?? '' })}
        back={{ href: '/', label: t('back') }}
        previewNote={isPreview ? t('preview') : undefined}
      >
        <p className="text-sm text-text-muted">{place}</p>
        {viewer && <p className="font-semibold">{t('yourPlace', { role: viewer.role })}</p>}
      </ScreenHeader>

      {SECTIONS.map(({ role, key }) => {
        const section = players.filter((player) => player.role === role)
        if (section.length === 0) return null
        const headingId = `sheet-${key}`
        return (
          <section key={key} aria-labelledby={headingId} className="flex flex-col gap-2">
            <h2
              id={headingId}
              className="font-display text-sm font-bold tracking-[0.15em] text-text-muted uppercase"
            >
              {t(key)}
            </h2>
            <ol className="divide-y divide-border-default overflow-hidden rounded-2xl border border-border-default bg-surface-card">
              {section.map((player, index) => (
                <SheetRow
                  key={player.playerId}
                  player={player}
                  number={role === 'playing' ? index + 1 : null}
                  index={players.indexOf(player)}
                />
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
