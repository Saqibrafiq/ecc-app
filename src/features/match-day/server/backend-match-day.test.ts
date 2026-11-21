import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { toLocalDate as day } from '@/domain/club-rules'

type Mocks = { request: Mock; selection: Mock }

const mocks = vi.hoisted<Mocks>(() => ({ request: vi.fn(), selection: vi.fn() }))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', () => ({ backendRequest: mocks.request }))
vi.mock('@/features/team', () => ({ loadSelection: mocks.selection }))

const { loadMatchDay, toSheetDate } = await import('./backend-match-day')

const ACTOR = { token: 'jwt', teamId: 1, isAdmin: false }
const NOW = new Date('2026-11-14T08:00:00Z')
const MATCH = {
  id: 'fixture-60',
  kind: 'match',
  team: { id: '1', name: 'ECC I' },
  date: day('2026-11-14'),
  startTime: null,
  ground: 'Nürnberg',
  opponent: 'NCC',
  isHome: false,
}
const PICKS = [
  ...Array.from({ length: 11 }, (_, index) => ({
    playerId: String(index + 1),
    role: 'playing' as const,
  })),
  { playerId: '12', role: 'twelfth' as const },
]

function selection(status = 'approved') {
  return {
    selection: { status, match: MATCH, picks: PICKS },
    names: Object.fromEntries(PICKS.map(({ playerId }) => [playerId, `Player ${playerId}`])),
  }
}

type Backend = {
  passes?: unknown[]
  signed?: unknown[]
  competition?: object
  ground?: object | null
}

function backend({
  passes = [
    {
      player: { id: 1 },
      registeredName: 'Player One Registered',
      passNumber: 'BY-1',
      validFrom: '2026-12-31T12:00:00.000Z',
      card: { filename: 'card-1.jpg' },
    },
    { player: 2, registeredName: 'Player 2', passNumber: 'BY-2' },
  ],
  signed = [],
  competition = {
    name: 'BCV Regionalliga Bayern',
    championship: 'BCV 2026',
    division: 'Regionalliga',
  },
  ground = { name: 'Nürnberg – Pitch 1' },
}: Backend = {}) {
  // Like the real client, a response goes through the caller's schema.
  mocks.request.mockImplementation(
    ({ path, schema }: { path: string; schema: { parse: (raw: unknown) => unknown } }) => {
      const respond = (value: unknown) => Promise.resolve(schema.parse(value))
      if (path.startsWith('/fixtures/')) {
        return respond({ date: '2026-11-14T12:00:00.000Z', ground, competition })
      }
      if (path.startsWith('/spielerpasses')) return respond({ docs: passes })
      if (path.startsWith('/match-sheets')) return respond({ docs: signed })
      return Promise.reject(new Error(`unexpected ${path}`))
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.selection.mockResolvedValue(selection())
  backend()
})

describe('toSheetDate', () => {
  it('writes a date as on the sheet', () => {
    expect(toSheetDate(day('2026-11-04'))).toBe('04.11.2026')
  })
})

describe('loadMatchDay', () => {
  it("fills the sheet's header and ECC's block from the fixture and the passes", async () => {
    const load = await loadMatchDay(ACTOR, 60, NOW)

    if (load?.kind !== 'ready') throw new Error('expected a match day')
    expect(load.data.sheet).toMatchObject({
      date: '14.11.2026',
      ground: 'Nürnberg – Pitch 1',
      championship: 'BCV 2026',
      division: 'Regionalliga',
      block: 'away',
    })
    expect(load.data.sheet.rows[0]).toMatchObject({
      label: '1',
      registeredName: 'Player One Registered',
      passNumber: 'BY-1',
    })
    expect(load.data.teamId).toBe(1)
    expect(load.data.cards).toEqual(new Map([['1', 'card-1.jpg']]))
    expect(load.data.signedSheet).toBeNull()
  })

  it('shows the players in sheet order, flagging those without a pass', async () => {
    const load = await loadMatchDay(ACTOR, 60, NOW)

    if (load?.kind !== 'ready') throw new Error('expected a match day')
    const { players, missingPasses } = load.data.matchDay
    expect(players).toHaveLength(12)
    expect(players[0]).toEqual({
      playerId: '1',
      label: '1',
      name: 'Player 1',
      registeredName: 'Player One Registered',
      passNumber: 'BY-1',
      validFrom: '2026-12-31',
      hasCard: true,
    })
    expect(players[1]).toMatchObject({ hasCard: false, validFrom: null })
    expect(players[11]).toMatchObject({ label: 'A1', registeredName: null, passNumber: null })
    expect(missingPasses).toHaveLength(10)
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('/spielerpasses') as string,
        auth: { as: 'service' },
      }),
    )
  })

  it('falls back to the competition name and empty fields, and reads the signed sheet', async () => {
    backend({
      competition: { name: 'BCV Regionalliga Bayern' },
      ground: null,
      signed: [{ id: 5, filename: 'signed.jpg', updatedAt: '2026-11-14T18:00:00.000Z' }],
      passes: [],
    })

    const load = await loadMatchDay(ACTOR, 60, NOW)

    if (load?.kind !== 'ready') throw new Error('expected a match day')
    expect(load.data.sheet).toMatchObject({
      championship: 'BCV Regionalliga Bayern',
      division: '',
      ground: '',
    })
    expect(load.data.signedSheet).toEqual({ id: 5, filename: 'signed.jpg' })
    expect(load.data.matchDay.signedSheetAt).toBe('2026-11-14T18:00:00.000Z')
  })

  it('reads no passes for an empty squad, and fills the home block for a home match', async () => {
    mocks.selection.mockResolvedValue({
      selection: { status: 'approved', match: { ...MATCH, isHome: true }, picks: [] },
      names: {},
    })

    const load = await loadMatchDay(ACTOR, 60, NOW)

    expect(load?.kind === 'ready' && load.data.sheet.block).toBe('home')
    expect(mocks.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('/spielerpasses') as string }),
    )
  })

  it('has nothing before the squad is approved, or for a match the actor may not see', async () => {
    mocks.selection.mockResolvedValueOnce(selection('submitted'))
    await expect(loadMatchDay(ACTOR, 60, NOW)).resolves.toEqual({ kind: 'not-approved' })

    mocks.selection.mockResolvedValueOnce(null)
    await expect(loadMatchDay(ACTOR, 61, NOW)).resolves.toBeNull()
  })
})
