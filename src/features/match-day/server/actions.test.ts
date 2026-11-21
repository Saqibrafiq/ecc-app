import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = { access: { kind: string; actor?: object }; load: Mock; upload: Mock; logError: Mock }

const mocks = vi.hoisted<Mocks>(() => ({
  access: { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } },
  load: vi.fn(),
  upload: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-14T18:00:00Z') }))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => ({}) }))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return {
    BackendError: actual.BackendError,
    isAccessError: actual.isAccessError,
    backendUpload: mocks.upload,
  }
})
vi.mock('@/features/team', () => ({ getTeamAccess: () => Promise.resolve(mocks.access) }))
vi.mock('./backend-match-day', () => ({ loadMatchDay: mocks.load }))

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { uploadSignedSheetAction } = await import('./actions')

function form(file: File | null = new File(['photo'], 'sheet.jpg', { type: 'image/jpeg' })) {
  const data = new FormData()
  data.set('fixtureId', '60')
  if (file) data.set('sheet', file)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.access = { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } }
  mocks.load.mockResolvedValue({ kind: 'ready', data: { teamId: 1, signedSheet: null } })
  mocks.upload.mockResolvedValue({})
})

describe('uploadSignedSheetAction', () => {
  it("creates the match's signed sheet as the captain", async () => {
    await expect(uploadSignedSheetAction(form())).resolves.toEqual({ status: 'uploaded' })

    expect(mocks.upload).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/match-sheets',
        auth: { as: 'member', token: 'jwt' },
        filename: 'signed-sheet-60.jpeg',
        data: { fixture: 60, team: 1 },
      }),
    )
  })

  it('replaces an earlier photo', async () => {
    mocks.load.mockResolvedValue({
      kind: 'ready',
      data: { teamId: 1, signedSheet: { id: 5, filename: 'old.jpg' } },
    })

    await uploadSignedSheetAction(form())

    expect(mocks.upload).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PATCH', path: '/match-sheets/5', data: {} }),
    )
  })

  it('refuses no file, an empty one, a document, or one too large', async () => {
    const tooLarge = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'a.jpg', {
      type: 'image/jpeg',
    })
    for (const file of [
      null,
      new File([], 'a.jpg', { type: 'image/jpeg' }),
      new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }),
      tooLarge,
    ]) {
      await expect(uploadSignedSheetAction(form(file))).resolves.toEqual({ status: 'invalid' })
    }
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('needs the right to the squad and an announced squad', async () => {
    mocks.load.mockResolvedValueOnce(null)
    await expect(uploadSignedSheetAction(form())).resolves.toEqual({ status: 'invalid' })

    mocks.load.mockResolvedValueOnce({ kind: 'not-approved' })
    await expect(uploadSignedSheetAction(form())).resolves.toEqual({ status: 'not-approved' })

    mocks.access = { kind: 'not-captain' }
    await expect(uploadSignedSheetAction(form())).resolves.toEqual({ status: 'unauthorized' })
  })

  it('reports a refused upload and logs other failures', async () => {
    mocks.upload.mockRejectedValueOnce(new BackendError(403, 'Forbidden'))
    await expect(uploadSignedSheetAction(form())).resolves.toEqual({ status: 'unauthorized' })

    mocks.upload.mockRejectedValueOnce(new Error('down'))
    await expect(uploadSignedSheetAction(form())).resolves.toEqual({ status: 'error' })
    expect(mocks.logError).toHaveBeenCalled()
  })
})
