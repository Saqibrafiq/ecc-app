import { z } from 'zod'

/** Push service endpoints are long URLs; anything longer than this is not one. */
const MAX_ENDPOINT_LENGTH = 1000
/** The browser's keys, base64url-encoded: a P-256 public key and a 16-byte secret. */
const MAX_KEY_LENGTH = 200
const BASE64URL = /^[\w-]+={0,2}$/

/** A subscription from the browser, checked before it is stored: an https endpoint and its keys. */
export const deviceSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(MAX_ENDPOINT_LENGTH),
  keys: z.object({
    p256dh: z.string().regex(BASE64URL).max(MAX_KEY_LENGTH),
    auth: z.string().regex(BASE64URL).max(MAX_KEY_LENGTH),
  }),
})

type Rule = { label: string; pattern: RegExp }

const SYSTEMS: readonly Rule[] = [
  { label: 'iPhone', pattern: /iPhone|iPod/ },
  { label: 'iPad', pattern: /iPad/ },
  { label: 'Android', pattern: /Android/ },
  { label: 'Windows', pattern: /Windows/ },
  { label: 'Mac', pattern: /Macintosh|Mac OS X/ },
  { label: 'Linux', pattern: /Linux/ },
]

// Order matters: Edge and Opera also name Chrome, and Chrome also names Safari.
const BROWSERS: readonly Rule[] = [
  { label: 'Edge', pattern: /Edg\// },
  { label: 'Opera', pattern: /OPR\// },
  { label: 'Samsung Internet', pattern: /SamsungBrowser/ },
  { label: 'Firefox', pattern: /Firefox|FxiOS/ },
  { label: 'Chrome', pattern: /Chrome|CriOS/ },
  { label: 'Safari', pattern: /Safari/ },
]

const find = (rules: readonly Rule[], userAgent: string) =>
  rules.find((rule) => rule.pattern.test(userAgent))?.label

/**
 * A short, human label for a device, e.g. "iPhone · Safari", so the Board can tell a member's
 * devices apart. The full user agent is not stored (data minimisation).
 */
export function describeDevice(userAgent: string): string {
  return (
    [find(SYSTEMS, userAgent), find(BROWSERS, userAgent)].filter(Boolean).join(' · ') ||
    'Unknown device'
  )
}
