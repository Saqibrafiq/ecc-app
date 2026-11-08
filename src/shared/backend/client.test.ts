import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('server-only', () => ({}))

const env = { BACKEND_URL: 'http://backend.test', BACKEND_SERVICE_API_KEY: 'service-key' }
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => env }))

const { BackendError, backendRequest, isAccessError, isBackendConfigured } =
  await import('./client')
const { listOf } = await import('./schemas')

const fetchMock = vi.fn()

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  env.BACKEND_URL = 'http://backend.test'
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('backendRequest', () => {
  it('calls the API as the member, uncached, and validates the response', async () => {
    respond(200, { docs: [{ id: 1 }] })

    const result = await backendRequest({
      path: '/teams',
      auth: { as: 'member', token: 'jwt' },
      schema: listOf(z.object({ id: z.number() })),
    })

    expect(result).toEqual({ docs: [{ id: 1 }] })
    expect(fetchMock).toHaveBeenCalledWith('http://backend.test/api/teams', {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json', Authorization: 'JWT jwt' },
      body: undefined,
    })
  })

  it('sends JSON as the service account', async () => {
    respond(201, { ok: true })

    await backendRequest({
      method: 'POST',
      path: '/practice-sessions',
      body: { team: 1 },
      auth: { as: 'service' },
      schema: z.object({ ok: z.boolean() }),
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://backend.test/api/practice-sessions',
      expect.objectContaining({
        method: 'POST',
        body: '{"team":1}',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'users API-Key service-key',
        },
      }),
    )
  })

  it("throws Payload's error message with the status", async () => {
    respond(403, { errors: [{ message: 'You are not allowed to perform this action.' }] })

    const failure = backendRequest({ path: '/x', schema: z.unknown() })

    await expect(failure).rejects.toThrow('You are not allowed to perform this action.')
    await expect(failure).rejects.toBeInstanceOf(BackendError)
  })

  it('falls back to the status text for an error without a body', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('oops', { status: 500, statusText: 'Server Error' }),
    )

    await expect(backendRequest({ path: '/x', schema: z.unknown() })).rejects.toThrow(
      'Server Error',
    )
  })

  it('fails fast when the response has another shape', async () => {
    respond(200, { unexpected: true })

    await expect(
      backendRequest({ path: '/x', schema: z.object({ docs: z.array(z.unknown()) }) }),
    ).rejects.toThrow()
  })

  it('refuses to run without a backend', async () => {
    env.BACKEND_URL = ''

    await expect(backendRequest({ path: '/x', schema: z.unknown() })).rejects.toThrow(
      'No backend configured',
    )
    expect(isBackendConfigured()).toBe(false)
  })
})

describe('helpers', () => {
  it('recognises refused sessions and missing permissions', () => {
    expect(isAccessError(new BackendError(401, 'x'))).toBe(true)
    expect(isAccessError(new BackendError(403, 'x'))).toBe(true)
    expect(isAccessError(new BackendError(500, 'x'))).toBe(false)
    expect(isAccessError(new Error('x'))).toBe(false)
  })
})
