import 'server-only'

import { z } from 'zod'

import { getServerEnv } from '@/shared/config/env'

/** Who a request runs as: the signed-in member (their token) or the app's service account. */
export type BackendAuth = { as: 'member'; token: string } | { as: 'service' }

export class BackendError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'BackendError'
  }
}

const HTTP_UNAUTHORIZED = 401
const HTTP_FORBIDDEN = 403

const payloadErrorSchema = z.object({
  errors: z.array(z.object({ message: z.string() })).optional(),
  message: z.string().optional(),
})

/** Whether the app talks to a backend, or runs as a preview with sample data. */
export function isBackendConfigured(): boolean {
  return Boolean(getServerEnv().BACKEND_URL)
}

function getAuthorization(auth: BackendAuth | undefined): string | undefined {
  if (!auth) return undefined
  if (auth.as === 'member') return `JWT ${auth.token}`
  return `users API-Key ${getServerEnv().BACKEND_SERVICE_API_KEY ?? ''}`
}

export type BackendRequest<T> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Path under `/api`, e.g. `/fixtures?limit=10`. */
  path: string
  body?: unknown
  auth?: BackendAuth
  /** Validates the response; a backend that changed shape fails fast here. */
  schema: z.ZodType<T>
}

/**
 * Calls the club website's Payload REST API from the server (backend-for-frontend, ADR-0002).
 * Never cached: answers and attendance change all the time.
 */
export async function backendRequest<T>({
  method = 'GET',
  path,
  body,
  auth,
  schema,
}: BackendRequest<T>): Promise<T> {
  const { BACKEND_URL } = getServerEnv()
  if (!BACKEND_URL) throw new BackendError(0, 'No backend configured')

  const authorization = getAuthorization(auth)
  const response = await fetch(`${BACKEND_URL}/api${path}`, {
    method,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = payloadErrorSchema.safeParse(json)
    const detail = error.success
      ? (error.data.errors?.[0]?.message ?? error.data.message)
      : undefined
    throw new BackendError(response.status, detail ?? response.statusText)
  }
  return schema.parse(json)
}

/** True for a refused session (expired or never valid) or a missing permission. */
export function isAccessError(error: unknown): boolean {
  return (
    error instanceof BackendError &&
    (error.status === HTTP_UNAUTHORIZED || error.status === HTTP_FORBIDDEN)
  )
}
