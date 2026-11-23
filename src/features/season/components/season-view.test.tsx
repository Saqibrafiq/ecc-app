import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'
import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { buildSeason } from '../domain/build-season'
import type { MatchOutcome, SeasonMatch } from '../types'
import { SeasonView } from './season-view'

const ECC_I = { id: '1', name: 'ECC I' }
const ECC_II = { id: '14', name: 'ECC II' }
const WON: MatchOutcome = { result: 'won', margin: { unit: 'runs', value: 36 }, method: null }
const LOST: MatchOutcome = { result: 'lost', margin: { unit: 'wickets', value: 2 }, method: null }

let nextId = 0
function match(overrides: Partial<SeasonMatch>): SeasonMatch {
  nextId += 1
  return {
    id: `fixture-${String(nextId)}`,
    kind: 'match',
    team: ECC_I,
    date: day('2026-11-14'),
    startTime: time('11:00'),
    ground: 'Nürnberg',
    opponent: 'NCC-I',
    competition: 'BCV Regionalliga Bayern',
    overs: 50,
    isHome: false,
    outcome: null,
    ...overrides,
  }
}

const MATCHES = [
  match({ date: day('2026-05-10'), team: ECC_II, opponent: 'BATCC-I', outcome: WON }),
  match({ date: day('2026-05-10'), team: ECC_II, opponent: 'BATCC-I', outcome: LOST }),
  match({ date: day('2026-11-14') }),
  match({
    date: day('2026-11-15'),
    team: ECC_II,
    opponent: 'TSVGC',
    isHome: true,
    startTime: null,
  }),
]

function season(overrides: Partial<Parameters<typeof buildSeason>[0]> = {}) {
  return buildSeason({
    year: 2026,
    today: day('2026-11-09'),
    ownTeam: ECC_I,
    matches: MATCHES,
    ...overrides,
  })
}

const showEarlier = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Show 2 earlier matches' }))
}

describe('SeasonView', () => {
  it("names the season and the member's team's record so far", () => {
    renderWithIntl(<SeasonView season={season()} isPreview={false} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Season schedule' })).toBeInTheDocument()
    expect(screen.getByText('Season 2026')).toBeInTheDocument()
    expect(
      screen.getByText('ECC I: 0 played · 0 won · 0 lost · 1 match to come'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Preview with sample data')).not.toBeInTheDocument()
  })

  it('opens on the next match day, the played part folded away', () => {
    renderWithIntl(<SeasonView season={season()} isPreview={false} />)

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['November 2026'])
    const next = screen.getByRole('heading', { level: 3, name: /Saturday, November 14/ })
    expect(next).toHaveTextContent('Next')
    expect(screen.getByRole('heading', { level: 3, name: 'Sunday, November 15' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Show 2 earlier matches' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('unfolds the season so far, month by month, and folds it away again', async () => {
    renderWithIntl(<SeasonView season={season()} isPreview={false} />)

    showEarlier()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['May 2026', 'November 2026'])
    const hide = screen.getByRole('button', { name: 'Hide earlier matches' })
    expect(hide).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(hide)
    await waitFor(() => {
      expect(screen.queryByRole('heading', { level: 2, name: 'May 2026' })).not.toBeInTheDocument()
    })
  })

  it('writes out each result of a double-header, and the start time of a match to come', () => {
    renderWithIntl(<SeasonView season={season()} isPreview={false} />)
    showEarlier()

    const doubleHeader = screen.getByText('vs BATCC-I').closest('li') as HTMLElement
    expect(doubleHeader).toHaveTextContent('BCV Regionalliga Bayern · Away · 2 matches')
    expect(
      within(doubleHeader)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Won by 36 runs', 'Lost by 2 wickets'])

    expect(screen.getByText('vs NCC-I').closest('li')).toHaveTextContent('11:00')
    const toCome = screen.getByText('vs TSVGC').closest('li')
    expect(toCome).toHaveTextContent('Home')
    expect(toCome).toHaveTextContent('Time to be confirmed')
  })

  it('calls a match day today "Today"', () => {
    renderWithIntl(<SeasonView season={season({ today: day('2026-11-14') })} isPreview={false} />)

    expect(screen.getByRole('heading', { level: 3, name: /November 14/ })).toHaveTextContent(
      'Today',
    )
  })

  it('shows no record without a team, and the whole season once it is over', () => {
    renderWithIntl(
      <SeasonView season={season({ ownTeam: null, today: day('2026-12-01') })} isPreview={false} />,
    )

    expect(screen.queryByText(/played/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /earlier matches/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'May 2026' })).toBeInTheDocument()
  })

  it('says when no fixtures are entered yet, and marks the preview', () => {
    renderWithIntl(<SeasonView season={season({ matches: [] })} isPreview />)

    expect(screen.getByRole('heading', { level: 2, name: 'No fixtures yet' })).toBeInTheDocument()
    expect(screen.getByText('Preview with sample data')).toBeInTheDocument()
  })

  it('speaks German', () => {
    renderWithIntl(<SeasonView season={season()} isPreview={false} />, { locale: 'de' })
    fireEvent.click(screen.getByRole('button', { name: '2 frühere Spiele anzeigen' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Saisonplan' })).toBeInTheDocument()
    expect(screen.getByText('Gewonnen mit 36 Runs')).toBeInTheDocument()
    expect(screen.getByText('Verloren mit 2 Wickets')).toBeInTheDocument()
  })
})
