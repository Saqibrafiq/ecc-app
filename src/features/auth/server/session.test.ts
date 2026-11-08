import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type SessionMocks = { isConfigured: boolean; cookie: string | undefined; request: Mock }

const mocks = vi.hoisted<SessionMocks>(() => ({
  isConfigured: true,
  cookie: 'jwt',
  request: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name === 'ecc-session' && mocks.cookie ? { value: mocks.cookie } : undefined,
    }),
}))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return {
    BackendError: actual.BackendError,
    isAccessError: actual.isAccessError,
    isBackendConfigured: () => mocks.isConfigured,
    backendRequest: mocks.request,
  }
})
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => ({}) }))

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { getCurrentMember, getSessionToken } = await import('./session')

/** Like the real client, the response goes through the caller's schema. */
function respondWith(value: unknown) {
  mocks.request.mockImplementation(({ schema }: { schema: { parse: (raw: unknown) => unknown } }) =>
    Promise.resolve(schema.parse(value)),
  )
}

beforeEach(() => {
  mocks.isConfigured = true
  mocks.cookie = 'jwt'
  mocks.request.mockReset()
})

describe('getSessionToken', () => {
  it('reads the session cookie', async () => {
    await expect(getSessionToken()).resolves.toBe('jwt')
    mocks.cookie = undefined
    await expect(getSessionToken()).resolves.toBeNull()
  })
})

describe('getCurrentMember', () => {
  it('reads the signed-in member from the backend, as them', async () => {
    respondWith({
      user: {
        id: 4,
        email: 'saqib@example.com',
        name: 'Saqib Rafiq',
        role: 'captain',
        player: { id: 52 },
        captainOf: 1,
      },
    })

    await expect(getCurrentMember()).resolves.toEqual({
      id: 4,
      email: 'saqib@example.com',
      name: 'Saqib Rafiq',
      role: 'captain',
      playerId: 52,
      captainOfTeamId: 1,
    })
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/users/me', auth: { as: 'member', token: 'jwt' } }),
    )
  })

  it('fills in what an account does not have yet', async () => {
    respondWith({ user: { id: 4, email: 'a@b.c', role: 'player' } })

    await expect(getCurrentMember()).resolves.toMatchObject({
      name: null,
      playerId: null,
      captainOfTeamId: null,
    })
  })

  it('has no member in the preview, without a cookie, or with an ended session', async () => {
    mocks.isConfigured = false
    await expect(getCurrentMember()).resolves.toBeNull()

    mocks.isConfigured = true
    mocks.cookie = undefined
    await expect(getCurrentMember()).resolves.toBeNull()

    mocks.cookie = 'jwt'
    respondWith({ user: null })
    await expect(getCurrentMember()).resolves.toBeNull()

    mocks.request.mockRejectedValue(new BackendError(401, 'expired'))
    await expect(getCurrentMember()).resolves.toBeNull()
  })

  it('lets other failures reach the error boundary', async () => {
    mocks.request.mockRejectedValue(new BackendError(500, 'down'))

    await expect(getCurrentMember()).rejects.toThrow('down')
  })
})
