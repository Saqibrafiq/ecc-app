import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { getServerEnv, parseServerEnv } = await import('./env')

describe('parseServerEnv', () => {
  it('runs as a preview without a backend', () => {
    expect(parseServerEnv({})).toEqual({
      BACKEND_URL: undefined,
      BACKEND_SERVICE_API_KEY: undefined,
      APP_NOW: undefined,
    })
    expect(parseServerEnv({ BACKEND_URL: '', BACKEND_SERVICE_API_KEY: '' }).BACKEND_URL).toBe(
      undefined,
    )
  })

  it('accepts a backend with its service key', () => {
    expect(
      parseServerEnv({ BACKEND_URL: 'http://localhost:3001', BACKEND_SERVICE_API_KEY: 'key' }),
    ).toEqual({
      BACKEND_URL: 'http://localhost:3001',
      BACKEND_SERVICE_API_KEY: 'key',
      APP_NOW: undefined,
    })
  })

  it('accepts a pinned clock for development, and only an ISO instant', () => {
    expect(parseServerEnv({ APP_NOW: '2027-05-03T08:00:00Z' }).APP_NOW).toBe('2027-05-03T08:00:00Z')
    expect(() => parseServerEnv({ APP_NOW: 'next monday' })).toThrow()
  })

  it('fails fast on a backend without a service key or with a bad URL', () => {
    expect(() => parseServerEnv({ BACKEND_URL: 'http://localhost:3001' })).toThrow(
      'BACKEND_SERVICE_API_KEY is required',
    )
    expect(() =>
      parseServerEnv({ BACKEND_URL: 'not a url', BACKEND_SERVICE_API_KEY: 'k' }),
    ).toThrow('Invalid server environment variables')
  })
})

describe('getServerEnv', () => {
  it('reads the process environment once', () => {
    vi.stubEnv('APP_NOW', '2026-11-09T09:00:00Z')

    const env = getServerEnv()

    expect(env.APP_NOW).toBe('2026-11-09T09:00:00Z')
    expect(getServerEnv()).toBe(env)
    vi.unstubAllEnvs()
  })
})
