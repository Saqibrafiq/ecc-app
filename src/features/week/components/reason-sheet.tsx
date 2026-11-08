'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { NoteSheet } from '@/shared/ui/note-sheet'

import { REASON_MAX_LENGTH } from '../domain/reason'

export type ReasonSheetProps = {
  open: boolean
  initialReason: string
  onSave: (reason: string) => void
  onClose: () => void
}

/** "Not going" always needs a reason (R-6), asked in a sheet at thumb height. */
export function ReasonSheet({ open, initialReason, onSave, onClose }: ReasonSheetProps) {
  const t = useTranslations('week.reason')
  return (
    <NoteSheet
      open={open}
      title={t('title')}
      description={t('description')}
      closeLabel={t('close')}
      label={t('label')}
      placeholder={t('placeholder')}
      maxLength={REASON_MAX_LENGTH}
      initialValue={initialReason}
      requiredMessage={t('required')}
      tooLongMessage={t('tooLong', { max: REASON_MAX_LENGTH })}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      onSubmit={onSave}
      onClose={onClose}
    >
      <p className="flex gap-2 rounded-xl bg-surface-raised p-3 text-sm text-text-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-practice" />
        {t('motion')}
      </p>
    </NoteSheet>
  )
}
