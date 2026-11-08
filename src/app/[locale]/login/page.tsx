import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'

import { getCurrentMember, SignInForm, signInAction } from '@/features/auth'
import { redirect } from '@/i18n/navigation'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('signIn')
  return { title: t('title') }
}

export default async function LoginPage() {
  // Already signed in: straight to the week.
  if (await getCurrentMember()) {
    redirect({ href: '/', locale: await getLocale() })
  }
  const t = await getTranslations('signIn')

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-2">
        <span className="font-display text-sm font-semibold tracking-[0.2em] text-accent-match uppercase">
          {t('eyebrow')}
        </span>
        <h1 className="font-display text-5xl leading-none font-bold uppercase">{t('title')}</h1>
        <p className="text-text-muted">{t('intro')}</p>
      </div>
      <SignInForm signIn={signInAction} />
    </main>
  )
}
