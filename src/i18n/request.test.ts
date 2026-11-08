import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rootLocale: vi.fn<() => Promise<string | undefined>>(),
  cookie: undefined as string | undefined,
}))

vi.mock('next/root-params', () => ({ locale: mocks.rootLocale }))
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: () => (mocks.cookie ? { value: mocks.cookie } : undefined) }),
}))
vi.mock('next-intl/server', () => ({
  getRequestConfig: (create: (params: { locale?: string }) => unknown) => create,
}))

const { default: getConfig } = (await import('./request')) as unknown as {
  default: (params: { locale?: string }) => Promise<{ locale: string; timeZone: string }>
}

beforeEach(() => {
  mocks.rootLocale.mockReset()
  mocks.cookie = undefined
})

describe('request config', () => {
  it("takes the route's locale, in the club's time zone", async () => {
    mocks.rootLocale.mockResolvedValue('de')

    await expect(getConfig({})).resolves.toMatchObject({ locale: 'de', timeZone: 'Europe/Berlin' })
  })

  it('lets an explicit locale win', async () => {
    mocks.rootLocale.mockResolvedValue('de')

    await expect(getConfig({ locale: 'en' })).resolves.toMatchObject({ locale: 'en' })
  })

  it('falls back to the language cookie in a Server Action, which has no route', async () => {
    mocks.rootLocale.mockRejectedValue(new Error('not in a route'))
    mocks.cookie = 'de'

    await expect(getConfig({})).resolves.toMatchObject({ locale: 'de' })
  })

  it('uses English for anything it does not know', async () => {
    mocks.rootLocale.mockResolvedValue('fr')

    await expect(getConfig({})).resolves.toMatchObject({ locale: 'en' })
  })
})
