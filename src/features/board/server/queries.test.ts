import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import type { BoardAccess } from './board-access'

type Mocks = { isConfigured: boolean; access: BoardAccess; matches: Mock; squad: Mock }

const mocks = vi.hoisted<Mocks>(() => ({
  isConfigured: true,
  access: { kind: 'board', actor: { token: 'jwt', teamId: null, isAdmin: true } },
  matches: vi.fn(),
  squad: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-09T09:00:00Z') }))
vi.mock('@/shared/backend/client', () => ({ isBackendConfigured: () => mocks.isConfigured }))
vi.mock('./board-access', () => ({ getBoardAccess: () => Promise.resolve(mocks.access) }))
vi.mock('./backend-board', async () => {
  const actual = await vi.importActual<typeof BackendBoard>('./backend-board')
  return {
    toBoardSquad: actual.toBoardSquad,
    getBoardMatches: mocks.matches,
    loadBoardSquad: mocks.squad,
  }
})

import type * as BackendBoard from './backend-board'

const { getBoard, getBoardSquad, isBoardMember } = await import('./queries')

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isConfigured = true
  mocks.access = { kind: 'board', actor: { token: 'jwt', teamId: null, isAdmin: true } }
})

describe('in the preview', () => {
  beforeEach(() => {
    mocks.isConfigured = false
  })

  it('shows the Board with sample squads', async () => {
    await expect(isBoardMember()).resolves.toBe(true)
    const board = await getBoard()
    expect(board).toMatchObject({ kind: 'board', isPreview: true })
    expect(board.kind === 'board' && board.matches.map((m) => m.squadStatus)).toEqual([
      'submitted',
      'open',
    ])
    await expect(getBoardSquad(201)).resolves.toMatchObject({
      kind: 'squad',
      isPreview: true,
      squad: { selection: { status: 'submitted' } },
    })
    await expect(getBoardSquad(5)).resolves.toEqual({ kind: 'not-found' })
  })
})

describe('with the backend', () => {
  it('is for the Board only', async () => {
    for (const access of [{ kind: 'signed-out' }, { kind: 'not-board' }] as const) {
      mocks.access = access
      await expect(isBoardMember()).resolves.toBe(false)
      await expect(getBoard()).resolves.toEqual(access)
      await expect(getBoardSquad(60)).resolves.toEqual(access)
    }
  })

  it("loads the week's squads and one squad for review", async () => {
    mocks.matches.mockResolvedValue([])
    mocks.squad.mockResolvedValueOnce({ deadlineDay: 'tuesday' }).mockResolvedValueOnce(null)

    await expect(isBoardMember()).resolves.toBe(true)
    await expect(getBoard()).resolves.toEqual({ kind: 'board', matches: [], isPreview: false })
    await expect(getBoardSquad(60)).resolves.toEqual({
      kind: 'squad',
      squad: { deadlineDay: 'tuesday' },
      isPreview: false,
    })
    await expect(getBoardSquad(61)).resolves.toEqual({ kind: 'not-found' })
  })
})
