'use client'

import { useTranslations } from 'next-intl'

import { BottomSheet } from '@/shared/ui/bottom-sheet'

import type { Candidate } from '../types'

export type TwelfthSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The players still free to pick. */
  candidates: readonly Candidate[]
  onPick: (playerId: string) => void
}

/** Asked as soon as the XI is full: who is the 12th man (R-12)? */
export function TwelfthSheet({ open, onOpenChange, candidates, onPick }: TwelfthSheetProps) {
  const t = useTranslations('team.squad.twelfthSheet')
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      closeLabel={t('close')}
    >
      {candidates.length === 0 ? (
        <p className="text-text-muted">{t('none')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(candidate.id)
                }}
                className="flex min-h-13 w-full items-center rounded-xl border border-border-default bg-surface-card px-4 text-left font-semibold transition-colors duration-150 hover:border-accent-match hover:bg-surface-raised"
              >
                {candidate.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  )
}
