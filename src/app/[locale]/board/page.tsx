import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import { BoardView, getBoard } from '@/features/board'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from '../app-nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('boardTitle') }
}

// The week's squads as they stand now: rendered per request.
export const dynamic = 'force-dynamic'

export default async function BoardPage() {
  const result = await getBoard()
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <>
      <PageMain>
        <BoardView result={result} />
      </PageMain>
      <AppNav />
    </>
  )
}
