import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { BoardAccessState } from './board-access-state'
import { BoardView } from './board-view'

vi.mock('server-only', () => ({}))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const { getTeamPreviewNow } = await import('@/features/team')
const { getSampleBoardMatches } = await import('../server/sample-board')

const MATCHES = getSampleBoardMatches(getTeamPreviewNow(new Date('2026-11-09T09:00:00Z')))

describe('BoardView', () => {
  it("lists the week's squads with their state and deadline", () => {
    renderWithIntl(<BoardView result={{ kind: 'board', matches: MATCHES, isPreview: true }} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Squads' })).toBeInTheDocument()
    const [first, second] = screen.getAllByRole('listitem')
    if (!first || !second) throw new Error('expected two matches')
    expect(within(first).getByRole('heading', { name: 'ECC I vs Nürnberg CC' })).toBeVisible()
    expect(within(first).getByText('Waiting for your approval')).toBeVisible()
    expect(within(first).getByText('Answers close Tue 23:59')).toBeVisible()
    expect(within(first).getByRole('link', { name: 'Review squad' })).toHaveAttribute(
      'href',
      '/board/squad/201',
    )
    expect(within(second).getByText('Not submitted yet')).toBeVisible()
    expect(within(second).getByText('Answers close Wed 23:59')).toBeVisible()
    expect(screen.getByText(/Preview with sample data/)).toBeInTheDocument()
  })

  it('says when no team has a match', () => {
    renderWithIntl(<BoardView result={{ kind: 'board', matches: [], isPreview: false }} />)

    expect(screen.getByRole('heading', { name: 'A quiet week' })).toBeInTheDocument()
  })

  it('sends a member who is not on the Board back to their week', () => {
    renderWithIntl(<BoardView result={{ kind: 'not-board' }} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Board only' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your week' })).toHaveAttribute('href', '/')
  })
})

describe('BoardAccessState', () => {
  it('sends an unknown match back to the Board', () => {
    renderWithIntl(<BoardAccessState kind="not-found" />)

    expect(screen.getByRole('heading', { level: 1, name: 'Not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the Board' })).toHaveAttribute(
      'href',
      '/board',
    )
  })
})
