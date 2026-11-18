'use client'

import { IdCard } from 'lucide-react'
import Image from 'next/image'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'

import { toDisplayDate } from '@/shared/lib/display-date'
import { BottomSheet } from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'

import type { MatchDayPlayer } from '../types'

export type PassListProps = {
  fixtureId: number
  players: readonly MatchDayPlayer[]
}

/** The Spielerpass card's proportions (ID-1 card), for a stable layout while it loads. */
const CARD = { width: 856, height: 540 } as const

/** The selected players in sheet order, each with their Spielerpass to show the umpire (UC-13). */
export function PassList({ fixtureId, players }: PassListProps) {
  const t = useTranslations('matchDay.squad')
  const format = useFormatter()
  const [shown, setShown] = useState<MatchDayPlayer | null>(null)

  return (
    <>
      <ol className="flex flex-col divide-y divide-border-default rounded-2xl border border-border-default bg-surface-card px-4">
        {players.map((player) => (
          <li key={player.playerId} className="flex min-h-16 items-center gap-3 py-2">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised font-display font-bold tabular-nums"
            >
              {player.label}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">{player.name}</span>
              {player.passNumber ? (
                <span className="text-sm text-text-muted">
                  {[
                    player.registeredName && player.registeredName !== player.name
                      ? t('registeredAs', { name: player.registeredName })
                      : null,
                    t('pass', { number: player.passNumber }),
                    player.validUntil
                      ? t('validUntil', {
                          date: format.dateTime(toDisplayDate(player.validUntil), {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }),
                        })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              ) : (
                <span className="text-sm font-medium text-status-missed-text">{t('noPass')}</span>
              )}
            </span>
            {player.hasCard ? (
              <Button
                variant="outline"
                aria-label={t('showCardOf', { name: player.name })}
                onClick={() => {
                  setShown(player)
                }}
                className="shrink-0 px-3 text-base"
              >
                <IdCard aria-hidden="true" className="size-4" />
                {t('showCard')}
              </Button>
            ) : (
              player.passNumber && (
                <span className="shrink-0 text-xs text-text-muted">{t('noCard')}</span>
              )
            )}
          </li>
        ))}
      </ol>
      <BottomSheet
        open={shown !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setShown(null)
        }}
        title={t('cardTitle')}
        description={shown?.registeredName ?? shown?.name}
        closeLabel={t('close')}
      >
        {shown && (
          <Image
            // Private: served by the app server after its access check, never optimised or cached.
            src={`/api/match-day/${String(fixtureId)}/cards/${shown.playerId}`}
            alt={t('cardAlt', { name: shown.registeredName ?? shown.name })}
            width={CARD.width}
            height={CARD.height}
            unoptimized
            className="h-auto w-full rounded-xl bg-surface-raised"
          />
        )}
      </BottomSheet>
    </>
  )
}
