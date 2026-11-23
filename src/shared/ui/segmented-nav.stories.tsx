import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { SegmentedNav } from './segmented-nav'

const meta = {
  title: 'Shared/SegmentedNav',
  component: SegmentedNav,
  args: {
    label: 'Schedule',
    items: [
      { href: '/', label: 'This week' },
      { href: '/season', label: 'Season' },
    ],
  },
  parameters: { nextjs: { navigation: { pathname: '/' } } },
  decorators: [
    (Story) => (
      <div className="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SegmentedNav>

export default meta

type Story = StoryObj<typeof meta>

/** The week's view is current; the marker glides to the season on navigation. */
export const OnWeek: Story = {}

export const OnSeason: Story = {
  parameters: { nextjs: { navigation: { pathname: '/season' } } },
}

/** On a page outside these views, no segment is marked. */
export const Elsewhere: Story = {
  parameters: { nextjs: { navigation: { pathname: '/profile' } } },
}
