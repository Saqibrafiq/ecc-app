import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn, signOutAction } from '@/features/auth'
import { answerAction, getMyWeek, WeekView } from '@/features/week'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from './app-nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('weekTitle') }
}

// The week depends on today and on who is signed in: rendered per request.
export const dynamic = 'force-dynamic'

export default async function WeekPage() {
  const result = await getMyWeek()
  if (result.kind === 'signed-out') return redirectToSignIn()
  const tState = await getTranslations('weekState')
  const isPreview = result.kind === 'week' && result.isPreview

  return (
    <>
      <PageMain>
        <WeekView result={result} saveAnswer={isPreview ? undefined : answerAction} />
        {!isPreview && (
          <form action={signOutAction} className="self-center">
            <button
              type="submit"
              className="min-h-11 rounded-xl px-4 text-sm font-semibold text-text-muted transition-colors duration-150 hover:bg-surface-raised hover:text-text-default"
            >
              {tState('signOut')}
            </button>
          </form>
        )}
      </PageMain>
      <AppNav />
    </>
  )
}
