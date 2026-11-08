'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { z } from 'zod'

import { getPathname } from '@/i18n/navigation'
import { BackendError, backendRequest } from '@/shared/backend/client'
import { logError } from '@/shared/lib/log'

import { parseSignIn, type SignInState, toRejection } from '../domain/sign-in'
import { SESSION_COOKIE } from './session'

const HTTP_UNAUTHORIZED = 401
const MS_PER_SECOND = 1000
const HOME_PATH = '/'
const LOGIN_PATH = '/login'

const loginSchema = z.object({
  token: z.string().min(1),
  /** Expiry in seconds since the epoch. */
  exp: z.number(),
})

async function setSession(token: string, expiresAtSeconds: number): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAtSeconds * MS_PER_SECOND),
  })
}

/**
 * Signs a member in with their club account (the website's Payload login) and keeps the session
 * in an HTTP-only cookie on the app's own domain (ADR-0002). Payload locks an account for a while
 * after repeated wrong passwords.
 */
export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = parseSignIn(formData)
  if (!parsed.success) {
    return { status: 'invalid', email: parsed.email, fieldErrors: parsed.fieldErrors }
  }

  const { email } = parsed.credentials
  try {
    const { token, exp } = await backendRequest({
      method: 'POST',
      path: '/users/login',
      body: parsed.credentials,
      schema: loginSchema,
    })
    await setSession(token, exp)
  } catch (error) {
    if (error instanceof BackendError && error.status === HTTP_UNAUTHORIZED) {
      return { status: 'rejected', email, reason: toRejection(error.message) }
    }
    logError('Sign-in failed', error)
    return { status: 'error', email }
  }

  redirect(getPathname({ href: HOME_PATH, locale: await getLocale() }))
}

/** Ends the session in the app. The backend token simply expires. */
export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect(getPathname({ href: LOGIN_PATH, locale: await getLocale() }))
}
