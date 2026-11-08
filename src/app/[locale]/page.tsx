import { getTranslations } from 'next-intl/server'

import { Button } from '@/shared/ui/button'

export default async function HomePage() {
  const t = await getTranslations()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <span className="font-display text-sm font-semibold tracking-[0.2em] text-accent-match uppercase">
          {t('home.eyebrow')}
        </span>
        <h1 className="font-display text-5xl leading-none font-bold uppercase">
          {t('home.title')}
        </h1>
        <p className="text-base leading-relaxed text-text-muted">{t('home.intro')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Button size="lg">{t('button.going')}</Button>
        <Button size="lg" variant="outline">
          {t('button.notGoing')}
        </Button>
      </div>
    </main>
  )
}
