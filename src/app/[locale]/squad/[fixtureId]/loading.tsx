import { getTranslations } from 'next-intl/server'

import { PageMain } from '@/shared/ui/page-main'

const SKELETON_ROWS = 8
const PULSE = 'animate-pulse motion-reduce:animate-none'

/** While the team sheet loads: its shape, so nothing jumps when it arrives. */
export default async function TeamSheetLoading() {
  const t = await getTranslations('squad')
  return (
    <PageMain hasNav={false}>
      <div role="status" aria-label={t('loading')} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className={`h-4 w-36 rounded bg-surface-raised ${PULSE}`} />
          <div className={`h-9 w-52 rounded bg-surface-raised ${PULSE}`} />
          <div className={`h-4 w-44 rounded bg-surface-raised ${PULSE}`} />
        </div>
        <div className="flex flex-col gap-2">
          <div className={`h-4 w-24 rounded bg-surface-raised ${PULSE}`} />
          <div className="overflow-hidden rounded-2xl border border-border-default">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <div
                key={index}
                className={`h-12 border-b border-border-default bg-surface-card ${PULSE}`}
              />
            ))}
          </div>
        </div>
      </div>
    </PageMain>
  )
}
