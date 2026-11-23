import { getTranslations } from 'next-intl/server'

import { PageMain } from '@/shared/ui/page-main'

const SKELETON_DAYS = 5
const PULSE = 'animate-pulse motion-reduce:animate-none'

/** While the season loads: its shape, so nothing jumps when it arrives. */
export default async function SeasonLoading() {
  const t = await getTranslations('season')
  return (
    <PageMain>
      <div role="status" aria-label={t('loading')} className="flex flex-col gap-4">
        <div className={`h-13 rounded-xl bg-surface-raised ${PULSE}`} />
        <div className="flex flex-col gap-2">
          <div className={`h-4 w-28 rounded bg-surface-raised ${PULSE}`} />
          <div className={`h-9 w-56 rounded bg-surface-raised ${PULSE}`} />
        </div>
        {Array.from({ length: SKELETON_DAYS }, (_, index) => (
          <div key={index} className="flex gap-3">
            <div className={`h-12 w-12 shrink-0 rounded bg-surface-raised ${PULSE}`} />
            <div className={`h-20 flex-1 rounded-xl bg-surface-card ${PULSE}`} />
          </div>
        ))}
      </div>
    </PageMain>
  )
}
