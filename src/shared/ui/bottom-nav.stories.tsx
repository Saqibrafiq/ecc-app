import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CalendarDays, ChartNoAxesColumn, UserRound } from 'lucide-react'

import { BottomNav } from './bottom-nav'

const meta = {
  title: 'Shared/BottomNav',
  component: BottomNav,
  args: {
    label: 'Main',
    comingSoonLabel: 'coming soon',
    items: [
      { href: '/', label: 'Week', icon: <CalendarDays aria-hidden="true" className="size-5" /> },
      {
        href: '/attendance',
        label: 'Attendance',
        icon: <ChartNoAxesColumn aria-hidden="true" className="size-5" />,
      },
      {
        href: '/profile',
        label: 'Profile',
        icon: <UserRound aria-hidden="true" className="size-5" />,
        isComingSoon: true,
      },
    ],
  },
  parameters: { layout: 'fullscreen', nextjs: { navigation: { pathname: '/' } } },
} satisfies Meta<typeof BottomNav>

export default meta

type Story = StoryObj<typeof meta>

/** Fixed to the bottom edge; the current page is marked in gold. */
export const OnWeek: Story = {}

export const OnAttendance: Story = {
  parameters: { nextjs: { navigation: { pathname: '/attendance' } } },
}
