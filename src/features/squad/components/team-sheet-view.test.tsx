import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'
import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { SheetPlayer, TeamSheet } from '../types'
import { TeamSheetState } from './team-sheet-state'
import { TeamSheetView } from './team-sheet-view'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const player = (id: number, role: SheetPlayer['role'], isViewer = false): SheetPlayer => ({
  playerId: String(id),
  name: `Player ${String(id)}`,
  role,
  isViewer,
})
const XI = Array.from({ length: 11 }, (_, index) => player(index + 1, 'playing', index === 2))

function sheet(players: SheetPlayer[] = [...XI, player(12, 'twelfth')]): TeamSheet {
  return {
    fixtureId: 60,
    match: {
      id: 'fixture-60',
      kind: 'match',
      team: { id: '1', name: 'ECC I' },
      date: day('2026-11-14'),
      startTime: time('11:00'),
      ground: 'Nürnberg',
      opponent: 'NCC-I',
      isHome: false,
    },
    players,
  }
}

describe('TeamSheetView', () => {
  it('shows the match and the numbered XI, the member picked out', () => {
    renderWithIntl(<TeamSheetView sheet={sheet()} isPreview={false} />)

    expect(screen.getByRole('heading', { level: 1, name: 'vs NCC-I' })).toBeInTheDocument()
    expect(screen.getByText('Sat, Nov 14 · ECC I')).toBeInTheDocument()
    expect(screen.getByText('Away · Nürnberg · 11:00')).toBeInTheDocument()
    expect(screen.getByText("You're in the XI.")).toBeInTheDocument()

    const xi = within(screen.getByRole('region', { name: 'Playing XI' })).getAllByRole('listitem')
    expect(xi).toHaveLength(11)
    expect(xi[2]).toHaveTextContent('3Player 3You')
    expect(xi[0]).not.toHaveTextContent('You')
    expect(screen.getByRole('link', { name: 'Week' })).toHaveAttribute('href', '/')
  })

  it('lists the 12th man and reserves apart, and only the sections the squad has', () => {
    renderWithIntl(<TeamSheetView sheet={sheet()} isPreview={false} />)
    expect(within(screen.getByRole('region', { name: '12th man' })).getByText('Player 12'))
    expect(screen.queryByRole('region', { name: 'Reserves' })).not.toBeInTheDocument()
  })

  it("names the member's place as 12th man or reserve, and says nothing when not picked", () => {
    const { rerender } = renderWithIntl(
      <TeamSheetView sheet={sheet([player(1, 'reserve', true)])} isPreview={false} />,
    )
    expect(screen.getByText("You're a reserve.")).toBeInTheDocument()

    rerender(<TeamSheetView sheet={sheet([player(1, 'twelfth', true)])} isPreview={false} />)
    expect(screen.getByText("You're 12th man.")).toBeInTheDocument()

    rerender(<TeamSheetView sheet={sheet([player(1, 'playing')])} isPreview />)
    expect(screen.queryByText(/^You're/)).not.toBeInTheDocument()
    expect(screen.getByText('Preview: sample squad')).toBeInTheDocument()
  })

  it('keeps a player without a name in place, and a home match says so', () => {
    const home = sheet([{ ...player(1, 'playing'), name: '' }])
    renderWithIntl(
      <TeamSheetView
        sheet={{ ...home, match: { ...home.match, isHome: true, startTime: null } }}
        isPreview={false}
      />,
    )
    expect(screen.getByText('Unnamed player')).toBeInTheDocument()
    expect(screen.getByText('Home · Nürnberg')).toBeInTheDocument()
  })

  it('speaks German', () => {
    renderWithIntl(<TeamSheetView sheet={sheet()} isPreview={false} />, { locale: 'de' })
    expect(screen.getByRole('heading', { level: 1, name: 'gegen NCC-I' })).toBeInTheDocument()
    expect(screen.getByText('Du stehst in der XI.')).toBeInTheDocument()
  })
})

describe('TeamSheetState', () => {
  it('explains a squad not announced yet, and a match that does not exist', () => {
    const { rerender } = renderWithIntl(<TeamSheetState kind="not-announced" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Not announced yet' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your week' })).toHaveAttribute('href', '/')

    rerender(<TeamSheetState kind="not-found" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Match not found' })).toBeInTheDocument()
  })
})
