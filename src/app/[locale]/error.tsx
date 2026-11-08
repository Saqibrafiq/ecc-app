'use client'

import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { logError } from '@/shared/lib/log'
import { Button } from '@/shared/ui/button'
import { PageMain } from '@/shared/ui/page-main'
import { StateCard } from '@/shared/ui/state-card'

export type LocaleErrorProps = {
  error: Error & { digest?: string }
  retry: () => void
}

/** Any screen that fails to load: said plainly, with a retry (the details stay in the logs). */
export default function LocaleError({ error, retry }: LocaleErrorProps) {
  const t = useTranslations('errorPage')

  useEffect(() => {
    logError('A screen failed to load', error)
  }, [error])

  return (
    <PageMain hasNav={false}>
      <StateCard
        headingLevel={1}
        icon={<TriangleAlert aria-hidden="true" className="size-5" />}
        title={t('title')}
        text={t('text')}
      >
        <Button onClick={retry}>{t('retry')}</Button>
      </StateCard>
    </PageMain>
  )
}
