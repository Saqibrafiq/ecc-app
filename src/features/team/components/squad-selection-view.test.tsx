import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { SquadOutcome, SquadSelection } from '../types'
import { SquadSelectionView } from './squad-selection-view'

vi.mock('server-only', () => ({}))

const { getSampleSelection, getTeamPreviewNow } = await import('../server/sample-team')

const NOW = getTeamPreviewNow(new Date('2026-11-09T09:00:00Z'))
const SUBMITTED = 'Submitted to the Board. Only the Board can reopen it for changes.'

function selection(overrides: Partial<SquadSelection> = {}): SquadSelection {
  return { ...getSampleSelection(NOW), ...overrides }
}

/** A complete squad of selectable sample players: 11 playing and a 12th man. */
function completeSelection(overrides: Partial<SquadSelection> = {}): SquadSelection {
  const base = selection(overrides)
  const picks = base.candidates
    .filter((c) => c.eligibility.verdict !== 'not-selectable')
    .slice(0, 12)
    .map((c, index) => ({
      playerId: c.id,
      role: index < 11 ? ('playing' as const) : ('twelfth' as const),
    }))
  return { ...base, picks }
}

/** Many taps with layout animations: slow under coverage instrumentation. */
const SLOW = { timeout: 20_000 }

/** The element at an index, failing the test if there is none. */
function at(elements: readonly HTMLElement[], index: number): HTMLElement {
  const element = elements[index]
  if (!element) throw new Error(`no element at ${String(index)}`)
  return element
}

const row = (name: string) => screen.getByRole('button', { name: new RegExp(name) })
const freeRows = () =>
  screen
    .getAllByRole('button', { pressed: false })
    .filter((button) => !button.hasAttribute('disabled'))

async function pickEleven() {
  for (let index = 0; index < 11; index += 1) await userEvent.click(at(freeRows(), 0))
}

describe('SquadSelectionView', SLOW, () => {
  it('starts with nobody picked, and shows why some going players cannot play', () => {
    renderWithIntl(<SquadSelectionView selection={selection()} isPreview />)

    expect(screen.getByRole('heading', { level: 1, name: 'vs Nürnberg CC' })).toBeInTheDocument()
    expect(screen.getByText('15 going · 2 not going · 2 no answer')).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    expect(screen.getByText('0/11')).toBeInTheDocument()
    expect(row('Ali Shaan')).toBeEnabled()
    expect(row('Ali Shaan')).toHaveTextContent('Carried over (motion 2023/10)')
    expect(row('Bilal Mir')).toHaveTextContent("Needs this week's practice")
    expect(row('Omar Farooq')).toBeDisabled()
    expect(row('Omar Farooq')).toHaveTextContent('Sits out: missed the last match (motion 2023/10)')
    expect(row('Usman Khan')).toHaveTextContent('Not cleared for ECC I (motion 2024/06)')
    expect(screen.getByText('Preview with sample data, shown as Saturday')).toBeInTheDocument()
  })

  it('fills the XI, asks for the 12th man, then submits and locks the squad', async () => {
    const submit = vi.fn(() => Promise.resolve({ status: 'submitted' as const }))
    renderWithIntl(
      <SquadSelectionView selection={selection()} isPreview={false} submitSquad={submit} />,
    )
    const submitButton = screen.getByRole('button', { name: 'Submit for approval' })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Tap players to fill the XI.')).toBeInTheDocument()

    await pickEleven()

    const sheet = screen.getByRole('dialog', { name: '11 selected' })
    expect(within(sheet).getByText('Now pick the 12th man.')).toBeInTheDocument()
    await userEvent.click(at(within(sheet).getAllByRole('button'), 1))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('11/11')).toBeInTheDocument()
    expect(screen.getByText('1/1')).toBeInTheDocument()
    expect(screen.getByText('Squad complete: tap to add reserves, or submit.')).toBeInTheDocument()

    await userEvent.click(submitButton)

    expect(submit).toHaveBeenCalledWith({
      fixtureId: 201,
      picks: expect.arrayContaining([{ playerId: '2', role: 'playing' }]) as unknown,
    })
    expect(await screen.findByRole('status')).toHaveTextContent(SUBMITTED)
    expect(screen.queryByRole('button', { name: /Submit/ })).not.toBeInTheDocument()
    expect(row('Ali Shaan')).toBeDisabled()
  })

  it('adds reserves after the 12th man and drops a player on a second tap', async () => {
    renderWithIntl(<SquadSelectionView selection={selection()} isPreview />)
    await pickEleven()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(at(freeRows(), 0))
    expect(screen.getByRole('button', { pressed: true, name: /12th man/ })).toBeInTheDocument()
    await userEvent.click(at(freeRows(), 0))
    expect(screen.getByRole('button', { pressed: true, name: /Reserve/ })).toBeInTheDocument()

    await userEvent.click(row('Saqib Rafiq'))
    expect(row('Saqib Rafiq')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('10/11')).toBeInTheDocument()
  })

  it('submits in the preview without a server', async () => {
    renderWithIntl(<SquadSelectionView selection={completeSelection()} isPreview />)

    await userEvent.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(await screen.findByRole('status')).toHaveTextContent(SUBMITTED)
  })

  it.each<[SquadOutcome, string]>([
    ['invalid', 'This squad breaks a club rule. Reload the page and check it.'],
    ['unauthorized', "Only the team's captain can submit its squad."],
    ['error', 'The squad could not be submitted. Please try again.'],
  ])('says why a submission failed (%s)', async (status, message) => {
    const submit = vi.fn(() => Promise.resolve({ status }))
    renderWithIntl(
      <SquadSelectionView selection={completeSelection()} isPreview={false} submitSquad={submit} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('locks the squad when the server says it is already handed in', async () => {
    const submit = vi.fn(() => Promise.resolve({ status: 'locked' as const }))
    renderWithIntl(
      <SquadSelectionView selection={completeSelection()} isPreview={false} submitSquad={submit} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Submit for approval' }))

    expect(await screen.findByRole('status')).toHaveTextContent(SUBMITTED)
    expect(screen.queryByRole('button', { name: /Submit/ })).not.toBeInTheDocument()
  })

  it('shows a submitted or announced squad read-only', () => {
    const { unmount } = renderWithIntl(
      <SquadSelectionView selection={completeSelection({ status: 'submitted' })} isPreview />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(SUBMITTED)
    expect(screen.queryByText('Tap players to fill the XI.')).not.toBeInTheDocument()
    expect(row('Saqib Rafiq')).toBeDisabled()
    unmount()

    renderWithIntl(
      <SquadSelectionView selection={completeSelection({ status: 'approved' })} isPreview />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Approved and announced. Only the Board can change it now.',
    )
  })

  it("lets the captain change a squad the Board returned, with the Board's note", () => {
    const { unmount } = renderWithIntl(
      <SquadSelectionView
        selection={completeSelection({ status: 'returned', note: 'Pick a keeper' })}
        isPreview
      />,
    )
    expect(screen.getByText('Returned by the Board: Pick a keeper')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit for approval' })).toBeEnabled()
    unmount()

    renderWithIntl(
      <SquadSelectionView selection={selection({ status: 'returned', note: null })} isPreview />,
    )
    expect(
      screen.getByText('Returned by the Board. Please check it and submit again.'),
    ).toBeInTheDocument()
  })

  it('says so when nobody is left for the 12th man', async () => {
    const few = selection()
    renderWithIntl(
      <SquadSelectionView
        selection={{
          ...few,
          candidates: few.candidates
            .filter((c) => c.eligibility.verdict !== 'not-selectable')
            .slice(0, 11),
        }}
        isPreview
      />,
    )

    await pickEleven()

    expect(
      within(screen.getByRole('dialog')).getByText(
        'Nobody else can be picked. Ask the Board for help.',
      ),
    ).toBeInTheDocument()
  })
})
