import { CalendarClock, SearchX } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'
import { buttonVariants } from '@/shared/ui/button-variants'
import { StateCard } from '@/shared/ui/state-card'

export type TeamSheetStateProps = {
  /** The squad is not announced yet, or there is no such ECC match. */
  kind: 'not-announced' | 'not-found'
}

/** Why there is no team sheet to show yet, with the way back to the week. */
export function TeamSheetState({ kind }: TeamSheetStateProps) {
  const t = useTranslations(kind === 'not-announced' ? 'squad.notAnnounced' : 'squad.notFound')
  return (
    <StateCard
      headingLevel={1}
      icon={
        kind === 'not-announced' ? (
          <CalendarClock aria-hidden="true" className="size-5" />
        ) : (
          <SearchX aria-hidden="true" className="size-5" />
        )
      }
      title={t('title')}
      text={t('text')}
    >
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
        {t('back')}
      </Link>
    </StateCard>
  )
}
