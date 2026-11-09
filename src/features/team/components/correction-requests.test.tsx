import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'
import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { TeamCorrection } from '../types'
import { CorrectionRequests } from './correction-requests'

const REQUESTS: TeamCorrection[] = [
  { id: 1, playerName: 'Ali Shaan', practiceDate: day('2026-11-04'), note: 'Came late' },
  { id: 2, playerName: 'Bilal Mir', practiceDate: day('2026-10-28'), note: '' },
]

describe('CorrectionRequests', () => {
  it("shows each player's request with their note", () => {
    renderWithIntl(<CorrectionRequests corrections={REQUESTS} />)

    expect(screen.getByRole('heading', { name: 'Attendance corrections' })).toBeInTheDocument()
    expect(screen.getByText('Practice on Wednesday, November 4')).toBeInTheDocument()
    expect(screen.getByText('Came late')).toBeInTheDocument()
  })

  it('accepts or declines a request, and says when all are decided', async () => {
    const decide = vi.fn(() => Promise.resolve({ status: 'decided' as const }))
    renderWithIntl(<CorrectionRequests corrections={REQUESTS} decideCorrection={decide} />)

    await userEvent.click(screen.getByRole('button', { name: 'Accept Ali Shaan’s request' }))
    expect(decide).toHaveBeenCalledWith({ correctionId: 1, isAccepted: true })
    await userEvent.click(screen.getByRole('button', { name: 'Decline Bilal Mir’s request' }))
    expect(decide).toHaveBeenLastCalledWith({ correctionId: 2, isAccepted: false })

    expect(await screen.findByRole('status')).toHaveTextContent('All requests decided.')
  })

  it('keeps a request when deciding fails, and shows nothing without requests', async () => {
    const decide = vi.fn(() => Promise.resolve({ status: 'error' as const }))
    const { unmount } = renderWithIntl(
      <CorrectionRequests corrections={REQUESTS} decideCorrection={decide} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Accept Ali Shaan’s request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That could not be saved.')
    expect(screen.getByText('Ali Shaan')).toBeInTheDocument()
    unmount()

    const { container } = renderWithIntl(<CorrectionRequests corrections={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('decides in the page in the preview', async () => {
    renderWithIntl(<CorrectionRequests corrections={REQUESTS.slice(0, 1)} />)

    await userEvent.click(screen.getByRole('button', { name: 'Accept Ali Shaan’s request' }))

    expect(await screen.findByRole('status')).toHaveTextContent('All requests decided.')
  })
})
