import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = {
  isConfigured: boolean
  access: { kind: string; actor?: object }
  load: Mock
  file: Mock
  render: Mock
  logError: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  isConfigured: true,
  access: { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } },
  load: vi.fn(),
  file: vi.fn(),
  render: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/shared/lib/clock', () => ({ getNow: () => new Date('2026-11-14T08:00:00Z') }))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => ({}) }))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return {
    BackendError: actual.BackendError,
    isAccessError: actual.isAccessError,
    isBackendConfigured: () => mocks.isConfigured,
    backendFile: mocks.file,
  }
})
vi.mock('@/features/team', () => ({ getTeamAccess: () => Promise.resolve(mocks.access) }))
vi.mock('./backend-match-day', () => ({ loadMatchDay: mocks.load }))
vi.mock('./render-sheet', () => ({ renderMatchSheet: mocks.render }))

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { cardResponse, matchSheetResponse, signedSheetResponse } = await import('./files')

const DATA = {
  sheet: { date: '14.11.2026' },
  cards: new Map([['7', 'card 7.jpg']]),
  signedSheet: { id: 5, filename: 'signed.jpg' },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isConfigured = true
  mocks.access = { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } }
  mocks.load.mockResolvedValue({ kind: 'ready', data: DATA })
  mocks.render.mockResolvedValue(new Uint8Array([37, 80, 68, 70]))
  mocks.file.mockResolvedValue({ bytes: new Uint8Array([1, 2]).buffer, contentType: 'image/jpeg' })
})

describe('matchSheetResponse', () => {
  it('returns the filled sheet as a private PDF download', async () => {
    const response = await matchSheetResponse(60)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="DCB-Spielberichtsbogen-14.11.2026.pdf"',
    )
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(mocks.render).toHaveBeenCalledWith(DATA.sheet)
  })
})

describe('cardResponse', () => {
  it("streams a selected player's card, read as the service account", async () => {
    const response = await cardResponse(60, '7')

    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    expect(mocks.file).toHaveBeenCalledWith({
      path: '/spielerpass-cards/file/card%207.jpg',
      auth: { as: 'service' },
    })
  })

  it('answers not found for a player without a card or not in the squad', async () => {
    expect((await cardResponse(60, '8')).status).toBe(404)
    expect(mocks.file).not.toHaveBeenCalled()
  })
})

describe('signedSheetResponse', () => {
  it('streams the signed sheet, read as the caller', async () => {
    await signedSheetResponse(60)

    expect(mocks.file).toHaveBeenCalledWith({
      path: '/match-sheets/file/signed.jpg',
      auth: { as: 'member', token: 'jwt' },
    })
  })

  it('answers not found before a sheet is uploaded', async () => {
    mocks.load.mockResolvedValue({ kind: 'ready', data: { ...DATA, signedSheet: null } })

    expect((await signedSheetResponse(60)).status).toBe(404)
  })
})

describe('every match-day file', () => {
  it('is refused without the right to the squad, or before the announcement', async () => {
    mocks.access = { kind: 'not-captain' }
    expect((await matchSheetResponse(60)).status).toBe(401)

    mocks.access = { kind: 'allowed', actor: { token: 'jwt', teamId: 1, isAdmin: false } }
    mocks.load.mockResolvedValueOnce(null)
    expect((await matchSheetResponse(61)).status).toBe(404)

    mocks.load.mockResolvedValueOnce({ kind: 'not-approved' })
    expect((await matchSheetResponse(60)).status).toBe(409)

    mocks.isConfigured = false
    expect((await matchSheetResponse(60)).status).toBe(404)
  })

  it('maps a refused backend read to 401 and logs other failures', async () => {
    mocks.file.mockRejectedValueOnce(new BackendError(403, 'Forbidden'))
    expect((await cardResponse(60, '7')).status).toBe(401)

    mocks.render.mockRejectedValueOnce(new Error('broken template'))
    expect((await matchSheetResponse(60)).status).toBe(500)
    expect(mocks.logError).toHaveBeenCalledWith(
      'Serving a match-day file failed',
      expect.any(Error),
    )
  })
})
