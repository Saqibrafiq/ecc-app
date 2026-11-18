import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

vi.mock('server-only', () => ({}))

const env = { BACKEND_URL: 'http://backend.test', BACKEND_SERVICE_API_KEY: 'service-key' }
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => env }))
const {
  BackendError,
  backendFile,
  backendRequest,
  backendUpload,
  isAccessError,
  isBackendConfigured,
} = await import('./client')
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

/** The URL, options and headers of the last request sent. */
function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit]
  return { url, init, headers: Object.fromEntries(new Headers(init.headers)) }
}

describe('backendRequest', () => {
  it('calls the API as the member, uncached, and validates the response', async () => {
    respond(200, { docs: [{ id: 1 }] })

    const result = await backendRequest({
      path: '/teams',
      auth: { as: 'member', token: 'jwt' },
      schema: listOf(z.object({ id: z.number() })),
    })

    expect(result).toEqual({ docs: [{ id: 1 }] })
    const sent = lastRequest()
    expect(sent.url).toBe('http://backend.test/api/teams')
    expect(sent.init).toMatchObject({ method: 'GET', cache: 'no-store', body: undefined })
    expect(sent.headers).toEqual({ accept: 'application/json', authorization: 'JWT jwt' })
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

    const sent = lastRequest()
    expect(sent.url).toBe('http://backend.test/api/practice-sessions')
    expect(sent.init).toMatchObject({ method: 'POST', body: '{"team":1}' })
    expect(sent.headers).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: 'users API-Key service-key',
    })
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

describe('backendFile', () => {
  it('reads a file through the access-checked route, as the caller', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/jpeg' } }),
    )

    const file = await backendFile({ path: '/match-sheets/file/a.jpg', auth: { as: 'service' } })

    expect(new Uint8Array(file.bytes)).toEqual(new Uint8Array([1, 2, 3]))
    expect(file.contentType).toBe('image/jpeg')
    expect(lastRequest().headers.authorization).toBe('users API-Key service-key')
  })

  it('reports a refused file with its status', async () => {
    respond(403, { errors: [{ message: 'Forbidden' }] })

    await expect(
      backendFile({ path: '/spielerpass-cards/file/a.jpg', auth: { as: 'member', token: 'jwt' } }),
    ).rejects.toMatchObject({ status: 403, message: 'Forbidden' })
  })

  it('falls back to a generic type when the backend names none', async () => {
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1])))

    const file = await backendFile({ path: '/x', auth: { as: 'service' } })

    expect(file.contentType).toBe('application/octet-stream')
  })
})

describe('backendUpload', () => {
  it('sends the file and the other fields as Payload expects them', async () => {
    respond(201, { doc: { id: 7 } })

    const result = await backendUpload({
      path: '/match-sheets',
      auth: { as: 'member', token: 'jwt' },
      file: new Blob(['photo'], { type: 'image/jpeg' }),
      filename: 'sheet.jpg',
      data: { fixture: 60, team: 1 },
      schema: z.object({ doc: z.object({ id: z.number() }) }),
    })

    expect(result).toEqual({ doc: { id: 7 } })
    const { init, headers } = lastRequest()
    expect(init.method).toBe('POST')
    expect(headers.authorization).toBe('JWT jwt')
    const form = init.body as FormData
    expect((form.get('file') as File).name).toBe('sheet.jpg')
    expect(form.get('_payload')).toBe('{"fixture":60,"team":1}')
  })
})
