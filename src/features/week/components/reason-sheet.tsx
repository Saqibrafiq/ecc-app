'use client'

import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type SubmitEvent, useId, useState } from 'react'

import { BottomSheet } from '@/shared/ui/bottom-sheet'
import { Button } from '@/shared/ui/button'

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
  const id = useId()
  const [reason, setReason] = useState(initialReason)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = reason.trim()
    if (trimmed === '') {
      setError(t('required'))
      return
    }
    if (trimmed.length > REASON_MAX_LENGTH) {
      setError(t('tooLong', { max: REASON_MAX_LENGTH }))
      return
    }
    onSave(trimmed)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      title={t('title')}
      description={t('description')}
      closeLabel={t('close')}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-reason`} className="text-sm font-semibold">
            {t('label')}
          </label>
          <textarea
            id={`${id}-reason`}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setError(null)
            }}
            placeholder={t('placeholder')}
            rows={3}
            maxLength={REASON_MAX_LENGTH}
            aria-invalid={error !== null}
            aria-describedby={error ? `${id}-error` : undefined}
            className="min-h-24 w-full resize-none rounded-xl border border-border-strong bg-surface-card px-3 py-2.5 text-base text-text-default placeholder:text-text-muted"
          />
          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="text-sm font-medium text-status-missed-text"
            >
              {error}
            </p>
          )}
        </div>
        <p className="flex gap-2 rounded-xl bg-surface-raised p-3 text-sm text-text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-accent-practice" />
          {t('motion')}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" size="lg">
            {t('save')}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
