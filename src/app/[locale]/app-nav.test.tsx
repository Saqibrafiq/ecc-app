import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

const mocks = vi.hoisted(() => ({ isCaptain: true, isBoard: true }))

vi.mock('@/features/team', () => ({ isTeamCaptain: () => Promise.resolve(mocks.isCaptain) }))
vi.mock('@/features/board', () => ({ isBoardMember: () => Promise.resolve(mocks.isBoard) }))
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
  it('gives an admin the team and Board tabs', async () => {
    renderWithIntl(await AppNav())

    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/board')
  })

  it('leaves them out for players', async () => {
    mocks.isCaptain = false
    mocks.isBoard = false
    renderWithIntl(await AppNav())

    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Board' })).not.toBeInTheDocument()
  })
})
