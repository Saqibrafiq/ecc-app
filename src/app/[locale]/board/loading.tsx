import { getTranslations } from 'next-intl/server'

import { PageMain } from '@/shared/ui/page-main'

const SKELETON_CARDS = 3
const PULSE = 'animate-pulse motion-reduce:animate-none'

/** While a Board screen loads: its shape, so nothing jumps when it arrives. */
export default async function BoardLoading() {
  const t = await getTranslations('board')
  return (
    <PageMain>
      <div role="status" aria-label={t('loading')} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className={`h-4 w-32 rounded bg-surface-raised ${PULSE}`} />
          <div className={`h-9 w-48 rounded bg-surface-raised ${PULSE}`} />
        </div>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <div key={index} className={`h-36 rounded-2xl bg-surface-card ${PULSE}`} />
        ))}
      </div>
    </PageMain>
  )
}
