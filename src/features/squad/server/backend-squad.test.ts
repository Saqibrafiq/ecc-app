import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import type { z } from 'zod'

type Call = { path: string; auth: unknown; schema: z.ZodType }

const request = vi.hoisted<Mock<(call: Call) => Promise<unknown>>>(() => vi.fn())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return { BackendError: actual.BackendError, backendRequest: request }
})

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { loadTeamSheet } = await import('./backend-squad')

const VIEWER = { token: 'jwt', playerId: 52 }
const club = (id: number, name: string, isClubTeam: boolean) => ({
  id,
  name,
  shortName: name,
  isClubTeam,
})
const FIXTURE = {
  id: 60,
  date: '2026-11-14T12:00:00.000Z',
  startTime: '11:00',
  team1: club(2, 'NCC-I', false),
  team2: club(1, 'ECC-I', true),
  ground: { name: 'Nürnberg', clubCode: 'NCC' },
  competition: { name: 'BCV Regionalliga Bayern', maxOvers: 50 },
}
const APPROVED = {
  status: 'approved',
  picks: [
    { player: 7, role: 'twelfth' },
    { player: 52, role: 'playing' },
  ],
}

let responses: Record<string, unknown> = {}

beforeEach(() => {
  responses = {
    '/fixtures/60': FIXTURE,
    '/squads': { docs: [APPROVED] },
    '/players': {
      docs: [
        { id: 7, name: 'Ali Shaan' },
        { id: 52, name: 'Saqib Rafiq' },
      ],
    },
  }
  request.mockReset()
  request.mockImplementation(({ path, schema }: Call) => {
    const key = path.split('?')[0] ?? ''
    if (!(key in responses)) return Promise.reject(new BackendError(404, 'Not Found'))
    return Promise.resolve(schema.parse(responses[key]))
  })
})

const paths = () => (request.mock.calls as [Call][]).map(([call]) => call.path)

describe('loadTeamSheet', () => {
  it("reads an announced squad as the member, in sheet order, with the member's row marked", async () => {
    const result = await loadTeamSheet(VIEWER, 60)

    expect(result).toEqual({
      kind: 'sheet',
      sheet: {
        fixtureId: 60,
        match: expect.objectContaining({ id: 'fixture-60', opponent: 'NCC-I' }) as unknown,
        players: [
          { playerId: '52', name: 'Saqib Rafiq', role: 'playing', isViewer: true },
          { playerId: '7', name: 'Ali Shaan', role: 'twelfth', isViewer: false },
        ],
      },
    })
    expect((request.mock.calls as [Call][]).every(([call]) => call.auth)).toBe(true)
    expect(request.mock.calls[0]?.[0].auth).toEqual({ as: 'member', token: 'jwt' })
    expect(new URLSearchParams(paths()[2]?.split('?')[1]).get('where[id][in]')).toBe('7,52')
  })

  it('shows nothing before the Board announces the squad', async () => {
    responses['/squads'] = { docs: [{ status: 'submitted' }] }
    await expect(loadTeamSheet(VIEWER, 60)).resolves.toEqual({ kind: 'not-announced' })

    responses['/squads'] = { docs: [] }
    await expect(loadTeamSheet(VIEWER, 60)).resolves.toEqual({ kind: 'not-announced' })
  })

  it('knows no such match, nor one without an ECC team', async () => {
    await expect(loadTeamSheet(VIEWER, 99)).resolves.toEqual({ kind: 'not-found' })

    responses['/fixtures/60'] = { ...FIXTURE, team2: club(3, 'TSVGC', false) }
    await expect(loadTeamSheet(VIEWER, 60)).resolves.toEqual({ kind: 'not-found' })
  })

  it('reads no names for an announced squad stored without picks, and marks nobody unlinked', async () => {
    responses['/squads'] = { docs: [{ status: 'approved' }] }
    const empty = await loadTeamSheet({ token: 'jwt', playerId: null }, 60)

    expect(empty).toMatchObject({ kind: 'sheet', sheet: { players: [] } })
    expect(paths().some((path) => path.startsWith('/players'))).toBe(false)
  })

  it('lets any other backend failure through to the error boundary', async () => {
    request.mockRejectedValueOnce(new BackendError(500, 'Internal Server Error'))

    await expect(loadTeamSheet(VIEWER, 60)).rejects.toThrow(BackendError)
  })
})
