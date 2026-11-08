import { beforeEach, describe, expect, it, vi } from 'vitest'

import { INITIAL_SIGN_IN_STATE } from '../domain/sign-in'

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`)
  }),
  logError: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ set: mocks.set, delete: mocks.delete }),
}))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('de') }))
vi.mock('@/i18n/navigation', () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) =>
    locale === 'en' ? href : `/${locale}${href === '/' ? '' : href}`,
}))
vi.mock('@/shared/lib/log', () => ({ logError: mocks.logError }))
vi.mock('server-only', () => ({}))
vi.mock('@/shared/config/env', () => ({ getServerEnv: () => ({}) }))
vi.mock('@/shared/backend/client', async () => {
  const actual = await vi.importActual<typeof BackendClient>('@/shared/backend/client')
  return { BackendError: actual.BackendError, backendRequest: mocks.request }
})

import type * as BackendClient from '@/shared/backend/client'

const { BackendError } = await import('@/shared/backend/client')
const { signInAction, signOutAction } = await import('./actions')

function form(values: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, value] of Object.entries(values)) formData.set(name, value)
  return formData
}

const VALID = { email: 'saqib@example.com', password: 'secret' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signInAction', () => {
  it('keeps the session in an HTTP-only cookie and opens the week', async () => {
    mocks.request.mockResolvedValue({ token: 'jwt', exp: 1_800_000_000, user: {} })

    await expect(signInAction(INITIAL_SIGN_IN_STATE, form(VALID))).rejects.toThrow('REDIRECT /de')

    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/users/login', body: VALID }),
    )
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ecc-session',
        value: 'jwt',
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        expires: new Date(1_800_000_000_000),
      }),
    )
  })

  it('returns field errors without calling the backend', async () => {
    await expect(signInAction(INITIAL_SIGN_IN_STATE, form({ email: 'x' }))).resolves.toEqual({
      status: 'invalid',
      email: 'x',
      fieldErrors: { email: 'invalidEmail', password: 'required' },
    })
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('tells wrong credentials from a locked account', async () => {
    mocks.request.mockRejectedValueOnce(
      new BackendError(401, 'The email or password is incorrect.'),
    )
    await expect(signInAction(INITIAL_SIGN_IN_STATE, form(VALID))).resolves.toEqual({
      status: 'rejected',
      email: VALID.email,
      reason: 'credentials',
    })

    mocks.request.mockRejectedValueOnce(new BackendError(401, 'This user is locked.'))
    await expect(signInAction(INITIAL_SIGN_IN_STATE, form(VALID))).resolves.toMatchObject({
      reason: 'locked',
    })
    expect(mocks.set).not.toHaveBeenCalled()
  })

  it('logs other failures and reports an error', async () => {
    mocks.request.mockRejectedValue(new Error('backend down'))

    await expect(signInAction(INITIAL_SIGN_IN_STATE, form(VALID))).resolves.toEqual({
      status: 'error',
      email: VALID.email,
    })
    expect(mocks.logError).toHaveBeenCalled()
  })
})

describe('signOutAction', () => {
  it('ends the session and opens the sign-in page', async () => {
    await expect(signOutAction()).rejects.toThrow('REDIRECT /de/login')

    expect(mocks.delete).toHaveBeenCalledWith('ecc-session')
  })
})
