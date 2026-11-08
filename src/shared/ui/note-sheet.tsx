'use client'

import { type ReactNode, type SubmitEvent, useId, useState } from 'react'

import { BottomSheet } from './bottom-sheet'
import { Button } from './button'

export type NoteSheetProps = {
  open: boolean
  title: string
  description: string
  closeLabel: string
  /** The text field's label, placeholder and limit. */
  label: string
  placeholder: string
  maxLength: number
  initialValue?: string
  /** What is said when the note is empty or too long. */
  requiredMessage: string
  tooLongMessage: string
  submitLabel: string
  cancelLabel: string
  onSubmit: (note: string) => void
  onClose: () => void
  /** Extra context below the field, e.g. the rule behind it. */
  children?: ReactNode
}

/** A sheet that asks for a short, required note, e.g. a reason for not going (R-6). */
export function NoteSheet({
  open,
  title,
  description,
  closeLabel,
  label,
  placeholder,
  maxLength,
  initialValue = '',
  requiredMessage,
  tooLongMessage,
  submitLabel,
  cancelLabel,
  onSubmit,
  onClose,
  children,
}: NoteSheetProps) {
  const id = useId()
  const [note, setNote] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = note.trim()
    if (trimmed === '') {
      setError(requiredMessage)
      return
    }
    if (trimmed.length > maxLength) {
      setError(tooLongMessage)
      return
    }
    onSubmit(trimmed)
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
      title={title}
      description={description}
      closeLabel={closeLabel}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-note`} className="text-sm font-semibold">
            {label}
          </label>
          <textarea
            id={`${id}-note`}
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              setError(null)
            }}
            placeholder={placeholder}
            rows={3}
            maxLength={maxLength}
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
        {children}
        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variant="outline" size="lg" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" size="lg">
            {submitLabel}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
