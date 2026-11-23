import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { isSignedTick, signTick } = await import('./verify-tick')

const SECRET = 'a'.repeat(64)
const NOW = new Date('2026-11-09T10:07:00Z')
const SECONDS = String(NOW.getTime() / 1000)

function headers(timestamp: string, signature: string) {
  return new Headers({ 'x-jobs-timestamp': timestamp, 'x-jobs-signature': signature })
}

describe('isSignedTick', () => {
  it('accepts a fresh timestamp signed with the shared secret', () => {
    expect(isSignedTick(headers(SECONDS, signTick(SECONDS, SECRET)), SECRET, NOW)).toBe(true)
  })

  it('accepts a little clock difference, and refuses a replay from minutes ago', () => {
    const at = (offset: number) => String(Number(SECONDS) + offset)
    expect(isSignedTick(headers(at(-300), signTick(at(-300), SECRET)), SECRET, NOW)).toBe(true)
    expect(isSignedTick(headers(at(-301), signTick(at(-301), SECRET)), SECRET, NOW)).toBe(false)
    expect(isSignedTick(headers(at(301), signTick(at(301), SECRET)), SECRET, NOW)).toBe(false)
  })

  it('refuses another secret, a forged or missing signature, and a bad timestamp', () => {
    const otherSecret = signTick(SECONDS, 'b'.repeat(64))
    expect(isSignedTick(headers(SECONDS, otherSecret), SECRET, NOW)).toBe(false)
    expect(isSignedTick(headers(SECONDS, 'abcd'), SECRET, NOW)).toBe(false)
    expect(isSignedTick(new Headers(), SECRET, NOW)).toBe(false)
    expect(isSignedTick(headers('1e9', signTick('1e9', SECRET)), SECRET, NOW)).toBe(false)
  })
})
