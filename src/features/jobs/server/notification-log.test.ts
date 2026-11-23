import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'

type Call = { method?: string; path: string; auth: unknown; body?: unknown; schema: z.ZodType }
const request = vi.hoisted(() => vi.fn<(call: Call) => Promise<unknown>>())

vi.mock('server-only', () => ({}))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof Client>('@/shared/backend/client')
  return { BackendError: actual.BackendError, backendRequest: request }
})

import type * as Client from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { claimNotification, findLoggedKeys } = await import('./notification-log')

beforeEach(() => {
  request.mockReset()
  request.mockImplementation(({ schema }: Call) =>
    Promise.resolve(schema.parse({ docs: [{ key: 'reminder:2026-11-09:1' }] })),
  )
})

describe('findLoggedKeys', () => {
  it('reads which of these notifications were sent before, as the service account', async () => {
    await expect(
      findLoggedKeys(['reminder:2026-11-09:1', 'reminder:2026-11-09:2']),
    ).resolves.toEqual(new Set(['reminder:2026-11-09:1']))
    const [call] = request.mock.calls[0] ?? []
    expect(call?.auth).toEqual({ as: 'service' })
    expect(new URLSearchParams(call?.path.split('?')[1]).get('where[key][in]')).toBe(
      'reminder:2026-11-09:1,reminder:2026-11-09:2',
    )
  })

  it('asks nothing for no keys', async () => {
    await expect(findLoggedKeys([])).resolves.toEqual(new Set())
    expect(request).not.toHaveBeenCalled()
  })
})

describe('claimNotification', () => {
  it('records the notification before it is sent', async () => {
    await expect(claimNotification('check-in:practice-7:1', 'check-in', 1)).resolves.toBe(true)
    expect(request.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/notification-log',
      body: { key: 'check-in:practice-7:1', kind: 'check-in', user: 1 },
    })
  })

  it('stands back when the key is already taken, and passes other failures on', async () => {
    request.mockRejectedValueOnce(new BackendError(400, 'The following field is invalid: key'))
    await expect(claimNotification('k', 'reminder', 1)).resolves.toBe(false)

    request.mockRejectedValueOnce(new BackendError(503, 'down'))
    await expect(claimNotification('k', 'reminder', 1)).rejects.toThrow('down')
  })
})
