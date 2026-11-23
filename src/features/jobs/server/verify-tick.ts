import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

/** A signed tick is valid this long either side of now: a replayed request is refused. */
const MAX_SKEW_SECONDS = 5 * 60
const MS_PER_SECOND = 1000

export const TIMESTAMP_HEADER = 'x-jobs-timestamp'
export const SIGNATURE_HEADER = 'x-jobs-signature'

/** The HMAC-SHA256 of the timestamp, hex-encoded: what the workflow sends (ADR-0004). */
export function signTick(timestamp: string, secret: string): string {
  return createHmac('sha256', secret).update(timestamp).digest('hex')
}

/**
 * Whether a tick request comes from the club's scheduler: a recent timestamp, signed with the
 * shared secret. Compared in constant time, so the signature cannot be guessed byte by byte.
 */
export function isSignedTick(headers: Headers, secret: string, now: Date): boolean {
  const timestamp = headers.get(TIMESTAMP_HEADER) ?? ''
  const signature = headers.get(SIGNATURE_HEADER) ?? ''
  const seconds = Number(timestamp)
  if (!/^\d+$/.test(timestamp)) return false
  if (Math.abs(now.getTime() / MS_PER_SECOND - seconds) > MAX_SKEW_SECONDS) return false

  const expected = Buffer.from(signTick(timestamp, secret), 'hex')
  const given = Buffer.from(signature, 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}
