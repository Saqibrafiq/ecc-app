import { SearchX, ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { cn } from '@/shared/lib/cn'
import { buttonVariants } from '@/shared/ui/button-variants'
import { StateCard } from '@/shared/ui/state-card'

export type BoardAccessStateProps = {
  /** Not on the Board, or no such match of a club team. */
  kind: 'not-board' | 'not-found'
}

const LINK_CLASS = cn(buttonVariants({ variant: 'outline' }), 'w-full')

/** Why a Board screen is not shown, with the way back. */
export function BoardAccessState({ kind }: BoardAccessStateProps) {
  const t = useTranslations('board')
  const isNotBoard = kind === 'not-board'
  return (
    <StateCard
      headingLevel={1}
      icon={
        isNotBoard ? (
          <ShieldAlert aria-hidden="true" className="size-5" />
        ) : (
          <SearchX aria-hidden="true" className="size-5" />
        )
      }
      title={t(isNotBoard ? 'notBoard.title' : 'notFound.title')}
      text={t(isNotBoard ? 'notBoard.text' : 'notFound.text')}
    >
      <Link href={isNotBoard ? '/' : '/board'} className={LINK_CLASS}>
        {t(isNotBoard ? 'notBoard.back' : 'notFound.back')}
      </Link>
    </StateCard>
  )
}
