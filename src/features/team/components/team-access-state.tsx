import { SearchX, ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'
import { buttonVariants } from '@/shared/ui/button-variants'
import { StateCard } from '@/shared/ui/state-card'

export type TeamAccessStateProps = {
  /** Not a captain, or no such match or practice of their team. */
  kind: 'not-captain' | 'not-found'
}

const LINK_CLASS = cn(buttonVariants({ variant: 'outline' }), 'w-full')

/** Why a captain's screen is not shown, with the way back. */
export function TeamAccessState({ kind }: TeamAccessStateProps) {
  const t = useTranslations('team')
  if (kind === 'not-captain') {
    return (
      <StateCard
        headingLevel={1}
        icon={<ShieldAlert aria-hidden="true" className="size-5" />}
        title={t('notCaptain.title')}
        text={t('notCaptain.text')}
      >
        <Link href="/" className={LINK_CLASS}>
          {t('notCaptain.back')}
        </Link>
      </StateCard>
    )
  }
  return (
    <StateCard
      headingLevel={1}
      icon={<SearchX aria-hidden="true" className="size-5" />}
      title={t('notFound.title')}
      text={t('notFound.text')}
    >
      <Link href="/team" className={LINK_CLASS}>
        {t('notFound.back')}
      </Link>
    </StateCard>
  )
}
