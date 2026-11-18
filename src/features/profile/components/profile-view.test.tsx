import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { Profile } from '../types'
import { ProfileView } from './profile-view'

const router = vi.hoisted(() => ({ replace: vi.fn() }))

vi.mock('@/features/auth', () => ({ signOutAction: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/profile',
  useRouter: () => router,
}))

const PROFILE: Profile = {
  name: 'Saqib Rafiq',
  email: 'saqib@example.com',
  role: 'captain',
  teamName: 'ECC I',
  captainOfName: 'ECC I',
  playerName: 'Saqib Rafiq',
}

function render(profile: Partial<Profile> = {}, isPreview = false) {
  return renderWithIntl(
    <ProfileView result={{ kind: 'profile', profile: { ...PROFILE, ...profile }, isPreview }} />,
  )
}

beforeEach(() => {
  router.replace.mockClear()
})

describe('ProfileView', () => {
  it('shows who the member is, with their team and role', () => {
    render()

    expect(screen.getByRole('heading', { level: 1, name: 'Your profile' })).toBeInTheDocument()
    const card = screen.getByRole('region', { name: 'Member' })
    expect(within(card).getByText('Saqib Rafiq')).toBeInTheDocument()
    expect(within(card).getByText('ECC I · Captain of ECC I')).toBeInTheDocument()
    expect(within(card).getByText('Player record: Saqib Rafiq')).toBeInTheDocument()
    expect(screen.getByText('saqib@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })

  it.each<[Partial<Profile>, string]>([
    [{ role: 'admin', captainOfName: null }, 'ECC I · Board'],
    [{ role: 'player', captainOfName: null }, 'ECC I · Player'],
    [{ role: 'captain', captainOfName: null, teamName: null }, 'Captain'],
  ])('names the role %#', (profile, line) => {
    render(profile)

    expect(screen.getByText(line)).toBeInTheDocument()
  })

  it('tells a member whose account is not linked yet', () => {
    render({ playerName: null })

    expect(screen.getByText('Not linked to a player yet: ask the Board.')).toBeInTheDocument()
  })

  it('switches the language, keeping the page', async () => {
    render()
    const language = within(screen.getByRole('group', { name: 'Language' }))
    expect(language.getByRole('button', { name: 'English' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(language.getByRole('button', { name: 'English' }))
    expect(router.replace).not.toHaveBeenCalled()

    await userEvent.click(language.getByRole('button', { name: 'Deutsch' }))
    expect(router.replace).toHaveBeenCalledWith('/profile', { locale: 'de' })
  })

  it('has no sign out in the preview', () => {
    render({}, true)

    expect(screen.getByText('Preview with sample data')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })
})
