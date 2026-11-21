import { Download, TriangleAlert } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { cn } from '@/shared/lib/cn'
import { toDisplayDate } from '@/shared/lib/display-date'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ScreenHeader } from '@/shared/ui/screen-header'

import type { MatchDay, UploadSignedSheet } from '../types'
import { PassList } from './pass-list'
import { SignedSheetUpload } from './signed-sheet-upload'

export type MatchDayViewProps = {
  matchDay: MatchDay
  isPreview: boolean
  uploadSignedSheet?: UploadSignedSheet
}

const SECTION_TITLE = 'font-display text-xl font-bold uppercase'

/**
 * What the captain takes to an approved match (UC-13, UC-21, UC-22): the filled match report
 * sheet, every selected player's Spielerpass, and the signed sheet's photo afterwards.
 */
export function MatchDayView({ matchDay, isPreview, uploadSignedSheet }: MatchDayViewProps) {
  const t = useTranslations('matchDay')
  const format = useFormatter()
  const { match, fixtureId } = matchDay

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        eyebrow={t('eyebrow', {
          date: format.dateTime(toDisplayDate(match.date), {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }),
        })}
        title={t('title', { opponent: match.opponent ?? '' })}
        back={{ href: '/team', label: t('back') }}
        previewNote={isPreview ? t('preview') : undefined}
      />

      <section aria-labelledby="match-day-sheet" className="flex flex-col gap-3">
        <h2 id="match-day-sheet" className={SECTION_TITLE}>
          {t('sheet.title')}
        </h2>
        <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4">
          <p className="text-sm text-text-muted">{t('sheet.text', { block: matchDay.block })}</p>
          {matchDay.missingPasses.length > 0 && (
            <p className="flex gap-2 rounded-xl bg-status-missed-surface p-3 text-sm text-status-missed-text">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t('sheet.missing', { names: matchDay.missingPasses.join(', ') })}
            </p>
          )}
          {!isPreview && (
            <a
              href={`/api/match-day/${String(fixtureId)}/sheet`}
              download
              className={cn(buttonVariants({ size: 'lg' }), 'w-full')}
            >
              <Download aria-hidden="true" className="size-5" />
              {t('sheet.download')}
            </a>
          )}
        </div>
      </section>

      <section aria-labelledby="match-day-squad" className="flex flex-col gap-3">
        <h2 id="match-day-squad" className={SECTION_TITLE}>
          {t('squad.title')}
        </h2>
        <PassList fixtureId={fixtureId} players={matchDay.players} />
      </section>

      <section aria-labelledby="match-day-signed" className="flex flex-col gap-3">
        <h2 id="match-day-signed" className={SECTION_TITLE}>
          {t('signed.title')}
        </h2>
        <SignedSheetUpload
          fixtureId={fixtureId}
          uploadedAt={matchDay.signedSheetAt}
          uploadSignedSheet={uploadSignedSheet}
        />
      </section>
    </div>
  )
}
