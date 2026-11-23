import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

vi.mock('next-intl/server', async () => {
  const messages = (await import('@/i18n/messages/en.json')).default
  return {
    getTranslations: (namespace: 'schedule') =>
      Promise.resolve((key: keyof typeof messages.schedule) => messages[namespace][key]),
  }
})
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/season',
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const { ScheduleSwitch } = await import('./schedule-switch')

describe('ScheduleSwitch', () => {
  it('switches between this week and the season', async () => {
    renderWithIntl(await ScheduleSwitch())

    const nav = screen.getByRole('navigation', { name: 'Schedule' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'This week' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Season' })).toHaveAttribute('aria-current', 'page')
  })
})
