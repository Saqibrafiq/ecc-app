import { afterEach, describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(() => ({ APP_NOW: undefined as string | undefined }))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => env }))

const { getNow } = await import('./clock')

afterEach(() => {
  env.APP_NOW = undefined
  vi.unstubAllEnvs()
})

describe('getNow', () => {
  it('uses the real clock by default', () => {
    const before = Date.now()
    expect(getNow().getTime()).toBeGreaterThanOrEqual(before)
  })

  it('uses the pinned moment in development', () => {
    env.APP_NOW = '2026-11-09T09:00:00Z'
    expect(getNow().toISOString()).toBe('2026-11-09T09:00:00.000Z')
  })

  it('ignores the pinned moment in production', () => {
    env.APP_NOW = '2026-11-09T09:00:00Z'
    vi.stubEnv('NODE_ENV', 'production')
    expect(getNow().toISOString()).not.toBe('2026-11-09T09:00:00.000Z')
  })
})
