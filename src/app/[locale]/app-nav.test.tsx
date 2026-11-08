import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

const mocks = vi.hoisted(() => ({ isCaptain: true }))

vi.mock('@/features/team', () => ({ isTeamCaptain: () => Promise.resolve(mocks.isCaptain) }))
vi.mock('next-intl/server', async () => {
  const messages = (await import('@/i18n/messages/en.json')).default
  return {
    getTranslations: (namespace: 'nav') =>
      Promise.resolve((key: keyof typeof messages.nav) => messages[namespace][key]),
  }
})
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/team',
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const { AppNav } = await import('./app-nav')

describe('AppNav', () => {
  it('gives a captain the team tab', async () => {
    renderWithIntl(await AppNav())

    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Week' })).toBeInTheDocument()
  })

  it('leaves it out for everyone else', async () => {
    mocks.isCaptain = false
    renderWithIntl(await AppNav())

    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument()
  })
})
