import 'server-only'

import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'

import { getPathname } from '@/i18n/navigation'

/** Sends a visitor without a session to sign in, in their language. */
export async function redirectToSignIn(): Promise<never> {
  redirect(getPathname({ href: '/login', locale: await getLocale() }))
}
