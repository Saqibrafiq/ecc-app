import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day, toLocalTime as time } from '@/domain/club-rules'
import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { WeekEvent } from '../types'
import { OwnWeek } from './own-week'

const ECC_I = { id: 'ecc-1', name: 'ECC I' }

const PRACTICE: WeekEvent = {
  id: 'practice',
  kind: 'practice',
  team: ECC_I,
  date: day('2027-05-05'),
  startTime: time('18:30'),
  ground: 'Erlangen ground',
  closesAt: '2027-05-05T04:30:00.000Z',
  isOpen: true,
  isOwnTeam: true,
  answer: null,
  reason: null,
}
const MATCH: WeekEvent = {
  ...PRACTICE,
  id: 'match',
  kind: 'match',
  date: day('2027-05-08'),
  startTime: time('11:00'),
  ground: 'Nürnberg',
  opponent: 'Nürnberg CC',
  competition: 'BCV Regionalliga',
  overs: 20,
  isHome: false,
  closesAt: '2027-05-04T21:59:59.999Z',
}

function card(name: RegExp) {
  return screen.getByRole('article', { name })
}

describe('OwnWeek', () => {
  it('shows what is still to answer, with each deadline in 24-hour time', () => {
    renderWithIntl(<OwnWeek events={[PRACTICE, MATCH]} />)

    expect(screen.getByText('answers needed')).toBeInTheDocument()
    expect(screen.getByText("Wednesday's practice · Saturday's match")).toBeInTheDocument()
    expect(within(card(/vs Nürnberg CC/i)).getByText('Answer by Tue 23:59')).toBeInTheDocument()
    expect(
      within(card(/ECC I practice/i)).getByText('Practice · before Saturday'),
    ).toBeInTheDocument()
  })

  it('records Going at once and counts down', async () => {
    const save = vi.fn(() => Promise.resolve({ status: 'saved' as const }))
    renderWithIntl(<OwnWeek events={[PRACTICE, MATCH]} saveAnswer={save} />)

    const going = within(card(/ECC I practice/i)).getByRole('button', { name: 'Going' })
    await userEvent.click(going)

    expect(going).toHaveAttribute('aria-pressed', 'true')
    expect(save).toHaveBeenCalledWith({ eventId: 'practice', answer: 'going', reason: null })
    expect(screen.getByText('answer needed')).toBeInTheDocument()
  })

  it('asks for a reason before recording Not going', async () => {
    const save = vi.fn(() => Promise.resolve({ status: 'saved' as const }))
    renderWithIntl(<OwnWeek events={[MATCH]} saveAnswer={save} />)

    await userEvent.click(screen.getByRole('button', { name: 'Not going' }))
    const sheet = screen.getByRole('dialog', { name: 'Not going?' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }))

    expect(within(sheet).getByRole('alert')).toHaveTextContent('Please give a reason.')
    expect(save).not.toHaveBeenCalled()

    await userEvent.type(within(sheet).getByLabelText('Reason'), '  Working late  ')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }))

    expect(save).toHaveBeenCalledWith({
      eventId: 'match',
      answer: 'not-going',
      reason: 'Working late',
    })
    expect(screen.getByRole('button', { name: 'Not going' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('“Working late”')).toBeInTheDocument()
    expect(screen.getByText('All answered')).toBeInTheDocument()
  })

  it('keeps the earlier answer when the reason sheet is cancelled', async () => {
    renderWithIntl(<OwnWeek events={[MATCH]} />)

    await userEvent.click(screen.getByRole('button', { name: 'Not going' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not going' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows answers as closed after the deadline', () => {
    renderWithIntl(<OwnWeek events={[{ ...MATCH, isOpen: false, answer: 'going' }]} />)

    expect(screen.getByText('Answers closed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Going' })).toBeDisabled()
    expect(screen.getByText('All answered')).toBeInTheDocument()
  })
  it('puts the earlier answer back and says why when saving fails', async () => {
    const save = vi
      .fn<() => Promise<{ status: 'closed' | 'error' }>>()
      .mockResolvedValueOnce({ status: 'closed' })
      .mockResolvedValueOnce({ status: 'error' })
    renderWithIntl(
      <OwnWeek
        events={[{ ...PRACTICE, answer: 'not-going', reason: 'Away' }, MATCH]}
        saveAnswer={save}
      />,
    )

    const practice = card(/ECC I practice/i)
    await userEvent.click(within(practice).getByRole('button', { name: 'Going' }))

    expect(await within(practice).findByText('Answers for this have closed.')).toBeInTheDocument()
    expect(within(practice).getByRole('button', { name: 'Not going' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const match = card(/vs Nürnberg CC/i)
    await userEvent.click(within(match).getByRole('button', { name: 'Going' }))

    expect(
      await within(match).findByText('Your answer could not be saved. Please try again.'),
    ).toBeInTheDocument()
    expect(within(match).getByRole('button', { name: 'Going' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
