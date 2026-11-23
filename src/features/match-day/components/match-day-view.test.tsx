import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'
import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { MatchDay, NoShowsOutcome, SignedSheetOutcome } from '../types'
import { MatchDayView } from './match-day-view'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const MATCH_DAY: MatchDay = {
  fixtureId: 60,
  match: {
    id: 'fixture-60',
    kind: 'match',
    team: { id: '1', name: 'ECC I' },
    date: day('2026-11-14'),
    startTime: null,
    ground: 'Nürnberg',
    opponent: 'Nürnberg CC',
    isHome: false,
  },
  block: 'away',
  players: [
    {
      playerId: '1',
      label: '1',
      name: 'Ali Shaan',
      registeredName: 'Ali Shaan Khan',
      passNumber: 'BY-26-001',
      validFrom: day('2026-12-31'),
      hasCard: true,
    },
    {
      playerId: '2',
      label: '2',
      name: 'Bilal Mir',
      registeredName: 'Bilal Mir',
      passNumber: 'BY-26-002',
      validFrom: null,
      hasCard: false,
    },
    {
      playerId: '3',
      label: 'A1',
      name: 'Omar Farooq',
      registeredName: null,
      passNumber: null,
      validFrom: null,
      hasCard: false,
    },
  ],
  missingPasses: ['Omar Farooq'],
  signedSheetAt: null,
  noShowIds: [],
  noShowsRecordedAt: null,
  canRecordNoShows: true,
}

function render(
  matchDay: Partial<MatchDay> = {},
  upload?: () => Promise<{ status: SignedSheetOutcome }>,
  record?: () => Promise<{ status: NoShowsOutcome }>,
) {
  return renderWithIntl(
    <MatchDayView
      matchDay={{ ...MATCH_DAY, ...matchDay }}
      isPreview={false}
      uploadSignedSheet={upload}
      recordNoShows={record}
    />,
  )
}

const noShows = () => within(screen.getByRole('region', { name: "Who didn't come?" }))

const photo = () => new File(['photo'], 'sheet.jpg', { type: 'image/jpeg' })

describe('MatchDayView', () => {
  it('offers the filled sheet and warns about players without a pass', () => {
    render()

    expect(screen.getByRole('heading', { level: 1, name: 'vs Nürnberg CC' })).toBeInTheDocument()
    expect(screen.getByText(/with our away block filled in/)).toBeInTheDocument()
    expect(screen.getByText(/No Spielerpass yet for Omar Farooq/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Download the sheet (PDF)' })).toHaveAttribute(
      'href',
      '/api/match-day/60/sheet',
    )
  })

  it('lists the players in sheet order with their passes', () => {
    render()

    const [first, second, third] = within(
      screen.getByRole('region', { name: 'Squad and Spielerpasses' }),
    ).getAllByRole('listitem')
    expect(first).toHaveTextContent('Registered as Ali Shaan Khan · Pass BY-26-001 · valid from')
    expect(second).toHaveTextContent('Pass BY-26-002')
    expect(second).toHaveTextContent('No card image')
    expect(third).toHaveTextContent('A1Omar FarooqNo Spielerpass')
  })

  it("shows a player's Spielerpass card in a sheet", async () => {
    render()

    await userEvent.click(screen.getByRole('button', { name: 'Show Ali Shaan’s Spielerpass' }))

    const dialog = screen.getByRole('dialog', { name: 'Spielerpass' })
    expect(
      within(dialog).getByRole('img', { name: 'Spielerpass of Ali Shaan Khan' }),
    ).toHaveAttribute('src', '/api/match-day/60/cards/1')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uploads the signed sheet and shows it', async () => {
    const upload = vi.fn(() => Promise.resolve({ status: 'uploaded' as const }))
    render({}, upload)

    await userEvent.upload(screen.getByLabelText('Upload photo'), photo())

    const form = (upload.mock.calls[0] as unknown as [FormData])[0]
    expect(form.get('fixtureId')).toBe('60')
    expect((form.get('sheet') as File).name).toBe('sheet.jpg')
    expect(await screen.findByRole('status')).toHaveTextContent('Photo uploaded.')
    expect(
      screen.getByRole('img', { name: 'Photo of the signed match report sheet' }),
    ).toHaveAttribute('src', expect.stringContaining('/api/match-day/60/signed-sheet?v=') as string)
    expect(screen.getByLabelText('Replace photo')).toBeInTheDocument()
  })

  it('says why an upload failed, and ignores an empty choice', async () => {
    const upload = vi.fn(() => Promise.resolve({ status: 'invalid' as const }))
    render({}, upload)

    await userEvent.upload(screen.getByLabelText('Upload photo'), [])
    expect(upload).not.toHaveBeenCalled()

    await userEvent.upload(screen.getByLabelText('Upload photo'), photo())
    expect(await screen.findByRole('alert')).toHaveTextContent('Please choose a photo')
  })

  it('shows when the signed sheet was uploaded, and keeps an upload in the page in the preview', async () => {
    renderWithIntl(
      <MatchDayView
        matchDay={{ ...MATCH_DAY, missingPasses: [], signedSheetAt: '2026-11-14T18:30:00.000Z' }}
        isPreview
      />,
    )

    expect(screen.getByText('Preview with sample data')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/No Spielerpass yet/)).not.toBeInTheDocument()
    expect(screen.getByText(/Uploaded Sat, Nov 14/)).toBeInTheDocument()

    await userEvent.upload(screen.getByLabelText('Replace photo'), photo())
    expect(await screen.findByRole('status')).toHaveTextContent('Photo uploaded.')
  })
})

describe('recording no-shows', () => {
  it('starts with nobody marked and records who did not appear', async () => {
    const record = vi.fn(() => Promise.resolve({ status: 'saved' as const }))
    render({}, undefined, record)

    expect(noShows().getByText('Everyone appeared')).toBeInTheDocument()
    expect(noShows().queryAllByRole('button', { pressed: true })).toHaveLength(0)

    await userEvent.click(noShows().getByRole('button', { name: 'Mark Bilal Mir as absent' }))

    expect(noShows().getByText('1 did not appear')).toBeInTheDocument()
    expect(noShows().getByText('Sits out the next match')).toBeInTheDocument()

    await userEvent.click(noShows().getByRole('button', { name: 'Save' }))

    expect(record).toHaveBeenCalledWith({ fixtureId: 60, noShowIds: ['2'] })
    expect(await noShows().findByRole('status')).toHaveTextContent('They sit out the next match.')
  })

  it('records an empty list as everyone having appeared', async () => {
    const record = vi.fn(() => Promise.resolve({ status: 'saved' as const }))
    render({}, undefined, record)

    await userEvent.click(noShows().getByRole('button', { name: 'Save' }))

    expect(record).toHaveBeenCalledWith({ fixtureId: 60, noShowIds: [] })
    expect(await noShows().findByRole('status')).toHaveTextContent(
      'Everyone is available for the next match.',
    )
  })

  it('un-marks a player on a second tap', async () => {
    render()

    await userEvent.click(noShows().getByRole('button', { name: 'Mark Ali Shaan as absent' }))
    await userEvent.click(
      noShows().getByRole('button', { name: 'Mark Ali Shaan as present again' }),
    )

    expect(noShows().getByText('Everyone appeared')).toBeInTheDocument()
  })

  it('shows who was already marked, and when it was recorded', () => {
    render({ noShowIds: ['1'], noShowsRecordedAt: '2026-11-14T18:30:00.000Z' })

    expect(
      noShows().getByRole('button', { name: 'Mark Ali Shaan as present again' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(noShows().getByText(/Recorded Sat, Nov 14/)).toBeInTheDocument()
  })

  it('stays closed before the match is played', () => {
    render({ canRecordNoShows: false })

    expect(noShows().getByText('You can record this from the match day onwards.')).toBeVisible()
    expect(noShows().queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('says why recording failed', async () => {
    render({}, undefined, () => Promise.resolve({ status: 'error' as const }))

    await userEvent.click(noShows().getByRole('button', { name: 'Save' }))

    expect(await noShows().findByRole('alert')).toHaveTextContent('That could not be saved.')
  })
})
