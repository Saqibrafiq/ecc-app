import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`)
  },
}))
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('de') }))
vi.mock('@/i18n/navigation', () => ({
  getPathname: ({ href, locale }: { href: string; locale: string }) => `/${locale}${href}`,
}))

const { redirectToSignIn } = await import('./redirect-to-sign-in')

describe('redirectToSignIn', () => {
  it('opens the sign-in page in the visitor’s language', async () => {
    await expect(redirectToSignIn()).rejects.toThrow('REDIRECT /de/login')
  })
})
