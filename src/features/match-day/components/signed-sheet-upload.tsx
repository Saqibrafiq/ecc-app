'use client'

import { Camera } from 'lucide-react'
import Image from 'next/image'
import { useFormatter, useTranslations } from 'next-intl'
import { type ChangeEvent, useId, useState, useTransition } from 'react'

import { cn } from '@/shared/lib/cn'
import { buttonVariants } from '@/shared/ui/button-variants'

import type { SignedSheetOutcome, UploadSignedSheet } from '../types'
import { scalePhoto } from './scale-photo'

export type SignedSheetUploadProps = {
  fixtureId: number
  uploadedAt: string | null
  /** Uploads on the server; without it (the preview) the photo stays in the page. */
  uploadSignedSheet?: UploadSignedSheet
}

/** A4 portrait, for a stable layout while the photo loads. */
const SHEET = { width: 1131, height: 1600 } as const

/** The captain photographs the signed sheet after the match and uploads it (UC-22). */
export function SignedSheetUpload({
  fixtureId,
  uploadedAt,
  uploadSignedSheet,
}: SignedSheetUploadProps) {
  const t = useTranslations('matchDay.signed')
  const format = useFormatter()
  const id = useId()
  const [lastUpload, setLastUpload] = useState(uploadedAt)
  const [outcome, setOutcome] = useState<SignedSheetOutcome | null>(null)
  const [isUploading, startUploading] = useTransition()

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = event.target.files ?? []
    event.target.value = ''
    if (!file) return
    startUploading(async () => {
      const photo = await scalePhoto(file)
      const form = new FormData()
      form.set('fixtureId', String(fixtureId))
      form.set('sheet', photo)
      const status = uploadSignedSheet ? (await uploadSignedSheet(form)).status : 'uploaded'
      setOutcome(status)
      if (status === 'uploaded') setLastUpload(new Date().toISOString())
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4">
      <p className="text-sm text-text-muted">{t('text')}</p>
      {lastUpload && uploadSignedSheet && (
        <Image
          // Private: served by the app server after its access check; the time busts the cache.
          src={`/api/match-day/${String(fixtureId)}/signed-sheet?v=${encodeURIComponent(lastUpload)}`}
          alt={t('alt')}
          width={SHEET.width}
          height={SHEET.height}
          unoptimized
          className="h-auto w-full rounded-xl bg-surface-raised"
        />
      )}
      {lastUpload && (
        <p className="text-sm text-text-muted">
          {t('uploadedAt', {
            date: format.dateTime(new Date(lastUpload), {
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
      {outcome === 'uploaded' && (
        <p role="status" className="text-sm font-medium text-status-going-text">
          {t('uploaded')}
        </p>
      )}
      {outcome !== null && outcome !== 'uploaded' && (
        <p role="alert" className="text-sm font-medium text-status-missed-text">
          {t(`errors.${outcome}`)}
        </p>
      )}
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        disabled={isUploading}
        onChange={upload}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className={cn(
          buttonVariants({ variant: lastUpload ? 'outline' : 'primary' }),
          'w-full cursor-pointer peer-focus-visible:ring-2 peer-focus-visible:ring-accent-match peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        )}
      >
        <Camera aria-hidden="true" className="size-5" />
        {isUploading ? t('uploading') : lastUpload ? t('replace') : t('upload')}
      </label>
    </div>
  )
}
