import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'
import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { AttendanceLedger, LedgerStanding, LedgerTarget } from '../types'
import { AttendanceView } from './attendance-view'

vi.mock('server-only', () => ({}))

const { getSampleLedger } = await import('../server/sample-attendance')

const SAMPLE = getSampleLedger(new Date('2026-11-09T09:00:00Z'))

function render(ledger: AttendanceLedger = SAMPLE, requestCorrection = undefined as never) {
  return renderWithIntl(
    <AttendanceView
      result={{ kind: 'ledger', ledger, isPreview: false }}
      requestCorrection={requestCorrection}
    />,
  )
}

/** The first "I was there" button, failing the test if there is none. */
function firstAsk(): HTMLElement {
  const [button] = screen.getAllByRole('button', { name: /^I was there on/ })
  if (!button) throw new Error('no correction button')
  return button
}

const STANDING: LedgerStanding = {
  slots: [],
  attended: 1,
  required: 2,
  isRuleActive: true,
  standing: 'possible',
  stillNeeded: 1,
  matchDate: day('2026-11-14'),
}

const target = (overrides: Partial<LedgerTarget>): LedgerTarget => ({
  kind: 'away',
  motion: '2023/06',
  share: 0.5,
  required: 4,
  available: 2,
  stillNeeded: 2,
  upcoming: 3,
  standing: 'on-track',
  ...overrides,
})

describe('AttendanceView', () => {
  it("shows the member's standing, targets and practices by month", () => {
    render()

    expect(screen.getByRole('heading', { level: 1, name: 'Your attendance' })).toBeInTheDocument()
    expect(screen.getByText('ECC I · Season 2026')).toBeInTheDocument()
    const standing = screen.getByRole('region', { name: 'Selection' })
    expect(within(standing).getAllByRole('listitem')).toHaveLength(4)
    const targets = screen.getByRole('region', { name: 'Availability targets' })
    expect(within(targets).getByRole('meter', { name: 'Away matches' })).toBeInTheDocument()
    expect(within(targets).getByText(/Motion 2023\/06: 50% of the season/)).toBeInTheDocument()
    const practices = screen.getByRole('region', { name: 'Practices' })
    expect(within(practices).getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(1)
    expect(within(practices).getByText('Correction requested')).toBeInTheDocument()
    expect(within(practices).getAllByText('Cancelled').length).toBeGreaterThan(0)
  })

  it('asks the captain to correct a missed practice', async () => {
    const request = vi.fn(() => Promise.resolve({ status: 'requested' as const }))
    render(SAMPLE, request as never)

    await userEvent.click(firstAsk())
    const sheet = screen.getByRole('dialog', { name: 'I was there' })
    await userEvent.type(within(sheet).getByLabelText('What happened?'), 'Came late')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Ask for correction' }))

    expect(request).toHaveBeenCalledWith({
      practiceId: expect.any(Number) as number,
      note: 'Came late',
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your captain has been asked to correct it.',
    )
    expect(screen.getAllByText('Correction requested')).toHaveLength(2)
  })

  it('says when a request could not be sent', async () => {
    render(SAMPLE, (() => Promise.resolve({ status: 'error' })) as never)

    await userEvent.click(firstAsk())
    await userEvent.type(screen.getByLabelText('What happened?'), 'Came late')
    await userEvent.click(screen.getByRole('button', { name: 'Ask for correction' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The request could not be sent.')
  })

  it.each<[Partial<LedgerStanding>, RegExp]>([
    [{ standing: 'met' }, /You can be selected for the match on Saturday, November 14/],
    [{}, /Attend 1 of the next 0 practices/],
    [{ standing: 'out' }, /can’t be selected for the match on Saturday, November 14/],
    [{ isRuleActive: false }, /starts once 4 practices have taken place/],
    [{ matchDate: null }, /no match left this season/],
  ])('explains the standing %#', (overrides, message) => {
    render({ ...SAMPLE, standing: { ...STANDING, ...overrides } })

    expect(
      within(screen.getByRole('region', { name: 'Selection' })).getByText(message),
    ).toBeVisible()
  })

  it('explains each target and adds the captain target', () => {
    render({
      ...SAMPLE,
      targets: [
        target({ standing: 'met', stillNeeded: 0 }),
        target({ kind: 'captain', motion: '2023/05', share: 0.8, standing: 'missed', required: 0 }),
      ],
    })

    expect(screen.getByText(/Target reached for the season/)).toBeInTheDocument()
    expect(screen.getByText('All matches, as captain')).toBeInTheDocument()
    expect(screen.getByText(/Can no longer be reached/)).toBeInTheDocument()
  })

  it('says when there are no practices yet, and why a member has no page', () => {
    const { unmount } = render({ ...SAMPLE, months: [] })
    expect(screen.getByText('No practices yet this season.')).toBeInTheDocument()
    unmount()

    const { unmount: unmountUnlinked } = renderWithIntl(
      <AttendanceView result={{ kind: 'unlinked' }} />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Almost there' })).toBeInTheDocument()
    unmountUnlinked()

    renderWithIntl(<AttendanceView result={{ kind: 'no-squad' }} />)
    expect(screen.getByRole('heading', { level: 1, name: 'No team yet' })).toBeInTheDocument()
  })

  it('keeps a request in the page in the preview', async () => {
    renderWithIntl(<AttendanceView result={{ kind: 'ledger', ledger: SAMPLE, isPreview: true }} />)

    expect(screen.getByText('Preview with sample data')).toBeInTheDocument()
    await userEvent.click(firstAsk())
    await userEvent.type(screen.getByLabelText('What happened?'), 'Came late')
    await userEvent.click(screen.getByRole('button', { name: 'Ask for correction' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Your captain has been asked')
  })
})
