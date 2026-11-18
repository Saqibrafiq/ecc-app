import { BellRing, LogOut } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { signOutAction } from '@/features/auth'
import { cn } from '@/shared/lib/cn'
import { getInitials } from '@/shared/lib/initials'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ScreenHeader } from '@/shared/ui/screen-header'

import type { ProfileResult } from '../server/queries'
import type { Profile } from '../types'
import { LanguageSwitch } from './language-switch'

export type ProfileViewProps = {
  result: Exclude<ProfileResult, { kind: 'signed-out' }>
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2
        id={id}
        className="font-display text-sm font-bold tracking-[0.15em] text-text-muted uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function useRoleLabel(profile: Profile): string {
  const t = useTranslations('profile.role')
  if (profile.role === 'admin') return t('admin')
  if (profile.role === 'captain' && profile.captainOfName) {
    return t('captainOf', { team: profile.captainOfName })
  }
  return t(profile.role)
}

/** Who the member is, their language and notifications, and signing out. */
export function ProfileView({ result }: ProfileViewProps) {
  const t = useTranslations('profile')
  const { profile, isPreview } = result
  const role = useRoleLabel(profile)

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        previewNote={isPreview ? t('preview') : undefined}
      />

      <section
        aria-label={t('card')}
        className="flex items-center gap-4 overflow-hidden rounded-2xl border border-border-default bg-surface-card p-4"
      >
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent-match font-display text-2xl font-bold text-text-on-accent"
        >
          {getInitials(profile.name)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-display text-2xl leading-tight font-bold text-balance uppercase">
            {profile.name}
          </p>
          <p className="font-semibold text-accent-match">
            {[profile.teamName, role].filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm text-text-muted">
            {profile.playerName ? t('player', { name: profile.playerName }) : t('unlinked')}
          </p>
        </div>
      </section>

      <Section id="profile-language" title={t('language.title')}>
        <LanguageSwitch />
      </Section>

      <Section id="profile-notifications" title={t('notifications.title')}>
        <div className="flex items-center gap-3 rounded-2xl border border-border-default bg-surface-card p-4">
          <BellRing aria-hidden="true" className="size-5 shrink-0 text-accent-practice" />
          <p className="flex-1 text-sm text-text-muted">{t('notifications.text')}</p>
          <span className="shrink-0 rounded-full bg-surface-raised px-2.5 py-1 text-xs font-bold text-text-muted">
            {t('notifications.soon')}
          </span>
        </div>
      </Section>

      <Section id="profile-account" title={t('account.title')}>
        <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4">
          <p className="flex flex-col">
            <span className="text-xs font-bold tracking-wide text-text-muted uppercase">
              {t('account.email')}
            </span>
            <span className="break-all">{profile.email}</span>
          </p>
          {!isPreview && (
            <form action={signOutAction}>
              <button
                type="submit"
                className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
              >
                <LogOut aria-hidden="true" className="size-5" />
                {t('account.signOut')}
              </button>
            </form>
          )}
        </div>
      </Section>
    </div>
  )
}
