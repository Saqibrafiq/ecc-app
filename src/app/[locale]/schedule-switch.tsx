import { getTranslations } from 'next-intl/server'

import { SegmentedNav } from '@/shared/ui/segmented-nav'

/** The Week tab's two views: this week, to answer, and the whole season, to plan ahead. */
export async function ScheduleSwitch() {
  const t = await getTranslations('schedule')
  return (
    <SegmentedNav
      label={t('label')}
      items={[
        { href: '/', label: t('week') },
        { href: '/season', label: t('season') },
      ]}
    />
  )
}
