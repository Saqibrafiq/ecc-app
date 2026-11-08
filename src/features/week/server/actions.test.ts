import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Member } from '@/features/auth'
import type * as BackendClient from '@/shared/backend/client'

const SIGNED_IN: Member = {
  id: 4,
  email: 'p@ecc.local',
  name: 'P',
  role: 'player',
  playerId: 52,
  captainOfTeamId: null,
}

const mocks = vi.hoisted(() => ({
  member: null as Member | null,
  token: 'jwt',
  now: new Date('2026-11-09T09:00:00Z'),
  request: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/config/env', () => ({
  getServerEnv: () => ({ BACKEND_URL: 'http://backend.test' }),
}))
vi.mock('@/features/auth', () => ({
  getCurrentMember: () => Promise.resolve(mocks.member),
  getSessionToken: () => Promise.resolve(mocks.token),
}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => mocks.now }))
vi.mock('@/shared/lib/log', () => ({ logError: vi.fn() }))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return {
    BackendError: actual.BackendError,
    isAccessError: actual.isAccessError,
    backendRequest: mocks.request,
  }
})

const { BackendError } = await import('@/shared/backend/client')
const { answerAction } = await import('./actions')

const FIXTURE = {
  id: 12,
  date: '2026-11-14T12:00:00.000Z',
  startTime: '11:00',
  team1: { id: 2, name: 'NCC-I', shortName: 'NCC-I', isClubTeam: false },
  team2: { id: 1, name: 'ECC-I', shortName: 'ECC-I', isClubTeam: true },
  ground: { name: 'Nürnberg', clubCode: 'NCC' },
  competition: { name: 'BCV Regionalliga Bayern', maxOvers: 50 },
}

/** Answers the client's requests in order, by path. */
function backend(responses: Record<string, unknown>) {
  mocks.request.mockImplementation(
    ({ path, method = 'GET' }: { path: string; method?: string }) => {
      const key = Object.keys(responses).find((prefix) => `${method} ${path}`.startsWith(prefix))
      if (!key) throw new Error(`unexpected ${method} ${path}`)
      const value = responses[key]
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value)
    },
  )
}

beforeEach(() => {
  mocks.request.mockReset()
  mocks.member = SIGNED_IN
  mocks.token = 'jwt'
  mocks.now = new Date('2026-11-09T09:00:00Z')
})

describe('answerAction', () => {
  it('creates a new answer as the member, for their own player', async () => {
    backend({
      'GET /fixtures/12': FIXTURE,
      'GET /squads': { docs: [] },
      'GET /availability-responses': { docs: [] },
      'POST /availability-responses': { doc: { id: 1 } },
    })

    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'saved',
    })
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        auth: { as: 'member', token: 'jwt' },
        body: { response: 'going', reason: null, player: 52, fixture: 12 },
      }),
    )
  })

  it('changes an existing answer, keeping the reason only for Not going', async () => {
    backend({
      'GET /practice-sessions/5': {
        id: 5,
        team: 1,
        date: '2026-11-11T12:00:00.000Z',
        startTime: '18:30',
      },
      'GET /availability-responses': { docs: [{ id: 7, player: 52 }] },
      'PATCH /availability-responses/7': {},
    })

    await expect(
      answerAction({ eventId: 'practice-5', answer: 'not-going', reason: '  Working late ' }),
    ).resolves.toEqual({ status: 'saved' })
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        body: { response: 'not-going', reason: 'Working late' },
      }),
    )
  })

  it('refuses an answer after the deadline', async () => {
    // Wednesday: the match's answers closed at the end of Tuesday.
    mocks.now = new Date('2026-11-11T09:00:00Z')
    backend({ 'GET /fixtures/12': FIXTURE, 'GET /squads': { docs: [] } })

    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'closed',
    })
  })

  it("follows an admin's deadline extension", async () => {
    mocks.now = new Date('2026-11-11T09:00:00Z')
    backend({
      'GET /fixtures/12': FIXTURE,
      'GET /squads': { docs: [{ deadlineDay: 'thursday' }] },
      'GET /availability-responses': { docs: [] },
      'POST /availability-responses': {},
    })

    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'saved',
    })
  })

  it('refuses invalid input: unknown events and Not going without a reason', async () => {
    await expect(
      answerAction({ eventId: 'sample-1', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'invalid',
    })
    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'not-going', reason: ' ' }),
    ).resolves.toEqual({
      status: 'invalid',
    })
    await expect(answerAction('nonsense')).resolves.toEqual({ status: 'invalid' })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('needs a signed-in member linked to a player', async () => {
    mocks.member = { ...SIGNED_IN, playerId: null }
    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'unauthorized',
    })
    mocks.member = null
    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'unauthorized',
    })
  })

  it('reports a refused session and other failures', async () => {
    backend({ 'GET /fixtures/12': new BackendError(401, 'expired'), 'GET /squads': { docs: [] } })
    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'unauthorized',
    })

    backend({ 'GET /fixtures/12': new Error('backend down'), 'GET /squads': { docs: [] } })
    await expect(
      answerAction({ eventId: 'fixture-12', answer: 'going', reason: null }),
    ).resolves.toEqual({
      status: 'error',
    })
  })
})
