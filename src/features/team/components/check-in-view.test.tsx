import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { CheckIn, CheckInOutcome } from '../types'
import { CheckInView } from './check-in-view'

vi.mock('server-only', () => ({}))

const { getSampleCheckIn, getTeamPreviewNow } = await import('../server/sample-team')

const NOW = getTeamPreviewNow(new Date('2026-11-09T09:00:00Z'))

function checkIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return { ...getSampleCheckIn(NOW), ...overrides }
}

describe('CheckInView', () => {
  it('lists who said Going first, with nobody ticked until the captain ticks them', () => {
    renderWithIntl(<CheckInView checkIn={checkIn()} isPreview={false} />)

    expect(screen.getByRole('heading', { level: 1, name: 'ECC I practice' })).toBeInTheDocument()
    const going = screen.getByRole('list', { name: 'Said going' })
    expect(within(going).getAllByRole('checkbox')).toHaveLength(15)
    expect(within(going).getByRole('checkbox', { name: /Saqib Rafiq/ })).not.toBeChecked()
    const others = screen.getByRole('list', { name: 'Rest of the squad' })
    expect(within(others).getByRole('checkbox', { name: /Danish Ali/ })).not.toBeChecked()
    expect(within(others).getByText('Lukas Braun').nextSibling).toHaveTextContent('Not going')
    expect(screen.getByText('Nobody present')).toBeInTheDocument()
  })

  it('saves who came, walk-ins included', async () => {
    const save = vi.fn(() => Promise.resolve({ status: 'saved' as const }))
    renderWithIntl(<CheckInView checkIn={checkIn()} isPreview={false} saveCheckIn={save} />)

    await userEvent.click(screen.getByRole('checkbox', { name: /Saqib Rafiq/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Danish Ali/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save check-in' }))

    const presentIds = (save.mock.calls[0] as unknown as [{ presentIds: string[] }])[0].presentIds
    expect(presentIds.sort()).toEqual(['1', '17'])
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ practiceId: 101 }))
    expect(await screen.findByRole('status')).toHaveTextContent('Attendance saved.')
  })

  it('keeps the check-in in the page in the preview', async () => {
    renderWithIntl(<CheckInView checkIn={checkIn()} isPreview />)

    expect(screen.getByText(/Preview with sample data/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save check-in' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Attendance saved.')
  })

  it.each<[CheckInOutcome, RegExp]>([
    ['not-yet', /The check-in opens on Wednesday/],
    ['error', /The check-in could not be saved/],
  ])('says why saving failed (%s)', async (status, message) => {
    const save = vi.fn(() => Promise.resolve({ status }))
    renderWithIntl(<CheckInView checkIn={checkIn()} isPreview={false} saveCheckIn={save} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save check-in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('opens only on the practice day, and never for a cancelled practice', () => {
    const { unmount } = renderWithIntl(
      <CheckInView checkIn={checkIn({ canCheckIn: false })} isPreview={false} />,
    )
    expect(screen.getByRole('heading', { name: 'Not yet' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    unmount()

    renderWithIntl(
      <CheckInView checkIn={checkIn({ canCheckIn: false, isCancelled: true })} isPreview={false} />,
    )
    expect(screen.getByRole('heading', { name: 'Practice cancelled' })).toBeInTheDocument()
  })

  it('shows a recorded check-in as saved', async () => {
    renderWithIntl(
      <CheckInView
        checkIn={checkIn({
          players: [{ id: '1', name: 'Saqib Rafiq', answer: 'going', isPresent: true }],
        })}
        isPreview={false}
      />,
    )

    expect(screen.getByRole('checkbox', { name: /Saqib Rafiq/ })).toBeChecked()
    expect(screen.getByText('1 present')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /Saqib Rafiq/ }))

    expect(screen.getByText('Nobody present')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Rest of the squad' })).not.toBeInTheDocument()
  })
})
