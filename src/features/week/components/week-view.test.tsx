import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { ECC_II, ECC_III, makeWeek, MATCH, PRACTICE } from '../test-factories'
import { WeekView } from './week-view'

function week(overrides: Partial<Parameters<typeof WeekView>[0]['result']> = {}) {
  return {
    kind: 'week' as const,
    week: makeWeek(),
    memberName: 'Saqib Rafiq',
    isPreview: false,
    nextMatch: null,
    ...overrides,
  }
}

describe('WeekView', () => {
  it('greets the member and lays out the week, the cards and the attendance', () => {
    renderWithIntl(<WeekView result={week()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Hi Saqib' })).toBeInTheDocument()
    expect(screen.getByText('ECC I · Nov 9 – Nov 15')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'This week' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /vs NCC-I/i })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /ECC I practice/i })).toBeInTheDocument()

    const attendance = screen.getByRole('region', { name: 'Practice attendance' })
    expect(within(attendance).getByText('2 / 4')).toBeInTheDocument()
    expect(
      within(attendance).getByText(
        "You can be selected. These practices count for Saturday's match.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Preview with sample data/)).not.toBeInTheDocument()
  })

  it('labels the preview', () => {
    renderWithIntl(<WeekView result={week({ isPreview: true })} />)

    expect(
      screen.getByText(/Preview with sample data, shown as Monday, November 9/),
    ).toBeInTheDocument()
  })

  it('shows a quiet week with the next match', () => {
    renderWithIntl(
      <WeekView result={week({ week: makeWeek([]), nextMatch: { ...MATCH, date: MATCH.date } })} />,
    )

    expect(screen.getByRole('heading', { name: 'A quiet week' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'No matches or practices for your team this week. Next match: NCC-I on Saturday, November 14',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Practice attendance' })).not.toBeInTheDocument()
  })

  it('shows a quiet week without a next match', () => {
    renderWithIntl(<WeekView result={week({ week: makeWeek([]) })} />)

    expect(screen.getByText('No matches or practices for your team this week.')).toBeInTheDocument()
  })

  it('groups the other teams’ events per team', () => {
    renderWithIntl(
      <WeekView
        result={week({
          week: makeWeek([
            PRACTICE,
            MATCH,
            { ...MATCH, id: 'fixture-13', team: ECC_II, opponent: 'TSVGC' },
            { ...MATCH, id: 'fixture-14', team: ECC_III, opponent: 'SDTCC-I' },
          ]),
        })}
      />,
    )

    expect(screen.getByRole('heading', { name: 'ECC II this week' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'ECC III this week' })).toBeInTheDocument()
  })

  it('tells a member whose account is not linked what to do', () => {
    renderWithIntl(<WeekView result={{ kind: 'unlinked' }} />)

    expect(screen.getByRole('heading', { name: 'Almost there' })).toBeInTheDocument()
  })

  it('tells a member without a team squad what happens next', () => {
    renderWithIntl(<WeekView result={{ kind: 'no-squad' }} />)

    expect(screen.getByRole('heading', { name: 'No team yet' })).toBeInTheDocument()
  })

  it('speaks German', () => {
    renderWithIntl(<WeekView result={week()} />, { locale: 'de' })

    expect(screen.getByRole('heading', { level: 1, name: 'Hallo Saqib' })).toBeInTheDocument()
  })
})
