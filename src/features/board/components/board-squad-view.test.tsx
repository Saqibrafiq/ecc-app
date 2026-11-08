import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import type { BoardActions, BoardOutcome, BoardSquad } from '../types'
import { BoardSquadView } from './board-squad-view'

const refresh = vi.hoisted(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ refresh }),
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const { getTeamPreviewNow } = await import('@/features/team')
const { toBoardSquad } = await import('../server/backend-board')
const { getSampleBoardSelection } = await import('../server/sample-board')

const NOW = getTeamPreviewNow(new Date('2026-11-09T09:00:00Z'))

function boardSquad(status: BoardSquad['selection']['status'] = 'submitted'): BoardSquad {
  const data = getSampleBoardSelection(NOW)
  return toBoardSquad({ ...data, selection: { ...data.selection, status } })
}

function actions(outcome: BoardOutcome = 'saved'): BoardActions {
  const result = () => Promise.resolve({ status: outcome })
  return {
    approve: vi.fn(result),
    sendBack: vi.fn(result),
    setDeadline: vi.fn(result),
    setException: vi.fn(result),
  }
}

beforeEach(() => {
  refresh.mockClear()
})

describe('BoardSquadView', () => {
  it("shows the captain's squad in order, waiting for approval", () => {
    renderWithIntl(<BoardSquadView squad={boardSquad()} isPreview />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'ECC I vs Nürnberg CC' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Waiting for your approval')).toBeInTheDocument()
    const squad = within(screen.getByRole('region', { name: 'Squad' })).getAllByRole('listitem')
    expect(squad).toHaveLength(12)
    expect(squad[0]).toHaveTextContent('1Ali Shaan')
    expect(squad[11]).toHaveTextContent('12th man')
    expect(screen.getByText(/Preview with sample data/)).toBeInTheDocument()
  })

  it('approves and announces the squad, then reloads it', async () => {
    const board = actions()
    renderWithIntl(<BoardSquadView squad={boardSquad()} isPreview={false} actions={board} />)

    await userEvent.click(screen.getByRole('button', { name: 'Approve and announce' }))

    expect(board.approve).toHaveBeenCalledWith({ fixtureId: 201 })
    expect(await screen.findByRole('status')).toHaveTextContent('Approved and announced.')
    expect(screen.getByText('Approved and announced', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reopen for the captain' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Availability closes' })).not.toBeInTheDocument()
    expect(refresh).toHaveBeenCalled()
  })

  it('sends the squad back to the captain with a note', async () => {
    const board = actions()
    renderWithIntl(<BoardSquadView squad={boardSquad()} isPreview={false} actions={board} />)

    await userEvent.click(screen.getByRole('button', { name: 'Send back to the captain' }))
    const sheet = screen.getByRole('dialog', { name: 'Send back' })
    await userEvent.type(within(sheet).getByLabelText('Note to the captain'), 'Pick a keeper')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send back' }))

    expect(board.sendBack).toHaveBeenCalledWith({ fixtureId: 201, note: 'Pick a keeper' })
    expect(await screen.findByRole('status')).toHaveTextContent('Sent back to the captain.')
    expect(screen.getByText('Your note: Pick a keeper')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument()
  })

  it('closes the note sheet without sending on cancel', async () => {
    const board = actions()
    renderWithIntl(<BoardSquadView squad={boardSquad()} isPreview={false} actions={board} />)

    await userEvent.click(screen.getByRole('button', { name: 'Send back to the captain' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(board.sendBack).not.toHaveBeenCalled()
  })

  it('extends the deadline', async () => {
    const board = actions()
    renderWithIntl(<BoardSquadView squad={boardSquad()} isPreview={false} actions={board} />)
    const days = within(screen.getByRole('group', { name: 'Availability closes' }))
    expect(days.getByRole('button', { name: 'Tuesday' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(days.getByRole('button', { name: 'Tuesday' }))
    expect(board.setDeadline).not.toHaveBeenCalled()

    await userEvent.click(days.getByRole('button', { name: 'Thursday' }))

    expect(board.setDeadline).toHaveBeenCalledWith({ fixtureId: 201, deadlineDay: 'thursday' })
    expect(await screen.findByRole('status')).toHaveTextContent('Deadline changed.')
    expect(days.getByRole('button', { name: 'Thursday' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Currently Thursday 23:59/)).toBeInTheDocument()
  })

  it('allows a blocked player for this match, with the rule against them', async () => {
    const board = actions()
    renderWithIntl(<BoardSquadView squad={boardSquad('open')} isPreview={false} actions={board} />)
    const exceptions = within(screen.getByRole('region', { name: 'Exceptions' }))
    expect(exceptions.getByText('Sits out: missed the last match (motion 2023/10)')).toBeVisible()

    await userEvent.click(exceptions.getByRole('button', { name: 'Allow: Omar Farooq' }))

    expect(board.setException).toHaveBeenCalledWith({
      fixtureId: 201,
      playerId: '4',
      isAllowed: true,
    })
    expect(await exceptions.findByRole('button', { name: 'Allowed: Omar Farooq' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('says when a decision failed and keeps the squad as it was', async () => {
    renderWithIntl(
      <BoardSquadView squad={boardSquad()} isPreview={false} actions={actions('not-allowed')} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Approve and announce' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The squad has changed in the meantime. Reload the page.',
    )
    expect(screen.getByText('Waiting for your approval')).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('decides in the page in the preview, and says when nothing is picked yet', async () => {
    const empty = boardSquad('open')
    renderWithIntl(<BoardSquadView squad={{ ...empty, squad: [] }} isPreview />)

    expect(screen.getByText('The captain has not picked a squad yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve|Send back/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Wednesday' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Deadline changed.')
  })
})
