import { CalendarDays, ChartNoAxesColumn, Shield, UserRound } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { isTeamCaptain } from '@/features/team'
import { BottomNav, type BottomNavItem } from '@/shared/ui/bottom-nav'

const ICON_CLASS = 'size-5'

/** The app's navigation: the week for everyone, the team for its captain. */
export async function AppNav() {
  const [t, showTeam] = await Promise.all([getTranslations('nav'), isTeamCaptain()])
  const team: BottomNavItem = {
    href: '/team',
    label: t('team'),
    icon: <Shield aria-hidden="true" className={ICON_CLASS} />,
  }
  const items: BottomNavItem[] = [
    {
      href: '/',
      label: t('week'),
      icon: <CalendarDays aria-hidden="true" className={ICON_CLASS} />,
    },
    ...(showTeam ? [team] : []),
    {
      href: '/attendance',
      label: t('attendance'),
      icon: <ChartNoAxesColumn aria-hidden="true" className={ICON_CLASS} />,
      isComingSoon: true,
    },
    {
      href: '/profile',
      label: t('profile'),
      icon: <UserRound aria-hidden="true" className={ICON_CLASS} />,
      isComingSoon: true,
    },
  ]
  return <BottomNav label={t('label')} comingSoonLabel={t('comingSoon')} items={items} />
}
