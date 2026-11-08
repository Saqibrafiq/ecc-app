import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { ECC_II, makeWeekEvent } from '../test-factories'
import type { AnswerOutcome } from '../types'
import { OtherTeamEvents } from './other-team-events'

const EVENT = makeWeekEvent({ id: 'fixture-13', team: ECC_II, opponent: 'TSVGC' })

function saveReturning(status: AnswerOutcome) {
  return vi.fn(() => Promise.resolve({ status }))
}

describe('OtherTeamEvents', () => {
  it('offers help as Going', async () => {
    const save = saveReturning('saved')
    renderWithIntl(<OtherTeamEvents teamName="ECC II" events={[EVENT]} saveAnswer={save} />)

    await userEvent.click(screen.getByRole('button', { name: 'I can help' }))

    expect(save).toHaveBeenCalledWith({ eventId: 'fixture-13', answer: 'going', reason: null })
    expect(await screen.findByRole('button', { name: 'You offered to help' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('withdraws an offer as Not going, with that as the reason', async () => {
    const save = saveReturning('saved')
    renderWithIntl(
      <OtherTeamEvents
        teamName="ECC II"
        events={[{ ...EVENT, answer: 'going' }]}
        saveAnswer={save}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'You offered to help' }))

    expect(save).toHaveBeenCalledWith({
      eventId: 'fixture-13',
      answer: 'not-going',
      reason: 'No longer available to help',
    })
  })

  it('undoes the offer and says why when it is not saved', async () => {
    renderWithIntl(
      <OtherTeamEvents teamName="ECC II" events={[EVENT]} saveAnswer={saveReturning('error')} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'I can help' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your answer could not be saved. Please try again.',
    )
    expect(screen.getByRole('button', { name: 'I can help' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('says when answers have closed', async () => {
    renderWithIntl(
      <OtherTeamEvents teamName="ECC II" events={[EVENT]} saveAnswer={saveReturning('closed')} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'I can help' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Answers for this have closed.')
  })

  it('keeps the offer in the page in the preview', async () => {
    renderWithIntl(<OtherTeamEvents teamName="ECC II" events={[EVENT]} />)

    await userEvent.click(screen.getByRole('button', { name: 'I can help' }))

    expect(screen.getByRole('button', { name: 'You offered to help' })).toBeInTheDocument()
  })

  it('shows no button once answers have closed, and nothing without events', () => {
    const { container } = renderWithIntl(
      <OtherTeamEvents
        teamName="ECC II"
        events={[{ ...EVENT, isOpen: false, kind: 'practice' }]}
      />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Practice')).toBeInTheDocument()
    expect(container).not.toBeEmptyDOMElement()
  })

  it('renders nothing without events', () => {
    const { container } = renderWithIntl(<OtherTeamEvents teamName="ECC II" events={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})
