import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { TeamWeek } from '../types'
import { TeamAccessState } from './team-access-state'
import { TeamWeekView } from './team-week-view'

vi.mock('server-only', () => ({}))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const { getSampleTeamWeek, getTeamPreviewNow } = await import('../server/sample-team')

const SAMPLE = getSampleTeamWeek(getTeamPreviewNow(new Date('2026-11-09T09:00:00Z')))

function week(overrides: Partial<TeamWeek> = {}): TeamWeek {
  return { ...SAMPLE, ...overrides }
}

const card = (name: RegExp) => screen.getByRole('heading', { name }).closest('li') as HTMLElement

describe('TeamWeekView', () => {
  it("shows the captain's practice to check in and match to select", () => {
    renderWithIntl(
      <TeamWeekView result={{ kind: 'team-week', teamWeek: week(), isPreview: true }} />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Your team' })).toBeInTheDocument()
    expect(screen.getByText('ECC I · Captain')).toBeInTheDocument()
    expect(screen.getByText(/Preview with sample data/)).toBeInTheDocument()
    const practice = card(/ECC I practice/)
    expect(within(practice).getByText('Check-in due')).toBeInTheDocument()
    expect(within(practice).getByRole('link', { name: 'Check in' })).toHaveAttribute(
      'href',
      '/team/check-in/101',
    )
    const match = card(/vs Nürnberg CC/)
    expect(within(match).getByText('Not selected yet')).toBeInTheDocument()
    expect(within(match).getByRole('link', { name: 'Select squad' })).toHaveAttribute(
      'href',
      '/team/squad/201',
    )
  })

  it('tells each practice and squad apart by where it stands', () => {
    const [practice] = SAMPLE.practices
    const [match] = SAMPLE.matches
    if (!practice || !match) throw new Error('sample week without events')
    renderWithIntl(
      <TeamWeekView
        result={{
          kind: 'team-week',
          isPreview: false,
          teamWeek: week({
            practices: [
              { ...practice, practiceId: 1, isRecorded: true },
              { ...practice, practiceId: 2, canCheckIn: false },
              { ...practice, practiceId: 3, canCheckIn: false, isCancelled: true },
            ],
            matches: [
              { ...match, fixtureId: 1, squadStatus: 'submitted' },
              { ...match, fixtureId: 2, squadStatus: 'approved' },
              { ...match, fixtureId: 3, squadStatus: 'returned' },
            ],
          }),
        }}
      />,
    )

    expect(screen.getByText('Attendance recorded')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Correct check-in' })).toBeInTheDocument()
    expect(screen.getByText('Check-in opens Wednesday')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getAllByText('Check in')).toHaveLength(2)
    expect(screen.getByText('Waiting for approval')).toBeInTheDocument()
    expect(screen.getByText('Approved and announced')).toBeInTheDocument()
    expect(screen.getByText('Returned by the Board')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'View squad' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Select squad' })).toHaveAttribute(
      'href',
      '/team/squad/3',
    )
  })

  it('says when the team has a quiet week', () => {
    renderWithIntl(
      <TeamWeekView
        result={{
          kind: 'team-week',
          isPreview: true,
          teamWeek: week({ practices: [], matches: [] }),
        }}
      />,
    )

    expect(screen.getByRole('heading', { name: 'A quiet week' })).toBeInTheDocument()
    expect(screen.queryByText(/Preview with sample data/)).not.toBeInTheDocument()
  })

  it('sends a member who is not a captain back to their week', () => {
    renderWithIntl(<TeamWeekView result={{ kind: 'not-captain' }} />)

    expect(screen.getByRole('heading', { name: 'Captains only' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your week' })).toHaveAttribute('href', '/')
  })
})

describe('TeamAccessState', () => {
  it('sends an unknown match or practice back to the team', () => {
    renderWithIntl(<TeamAccessState kind="not-found" />)

    expect(screen.getByRole('heading', { name: 'Not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your team' })).toHaveAttribute('href', '/team')
  })
})
