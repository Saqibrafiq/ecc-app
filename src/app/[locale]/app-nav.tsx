import { CalendarDays, ChartNoAxesColumn, ClipboardCheck, Shield, UserRound } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import { isBoardMember } from '@/features/board'
import { isTeamCaptain } from '@/features/team'
import { BottomNav, type BottomNavItem } from '@/shared/ui/bottom-nav'

const ICON_CLASS = 'size-5'

/** The app's navigation: the week for everyone, the team for captains and admins, the Board for admins. */
export async function AppNav() {
  const [t, showTeam, showBoard] = await Promise.all([
    getTranslations('nav'),
    isTeamCaptain(),
    isBoardMember(),
  ])
  const team: BottomNavItem = {
    href: '/team',
    label: t('team'),
    icon: <Shield aria-hidden="true" className={ICON_CLASS} />,
  }
  const board: BottomNavItem = {
    href: '/board',
    label: t('board'),
    icon: <ClipboardCheck aria-hidden="true" className={ICON_CLASS} />,
  }
  const items: BottomNavItem[] = [
    {
      href: '/',
      label: t('week'),
      icon: <CalendarDays aria-hidden="true" className={ICON_CLASS} />,
    },
    ...(showTeam ? [team] : []),
    ...(showBoard ? [board] : []),
    {
      href: '/attendance',
      label: t('attendance'),
      icon: <ChartNoAxesColumn aria-hidden="true" className={ICON_CLASS} />,
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
