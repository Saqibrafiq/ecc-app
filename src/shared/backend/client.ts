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

async function readError(response: Response): Promise<BackendError> {
  const json: unknown = await response.json().catch(() => null)
  const error = payloadErrorSchema.safeParse(json)
  const detail = error.success ? (error.data.errors?.[0]?.message ?? error.data.message) : undefined
  return new BackendError(response.status, detail ?? response.statusText)
}

/** Sends one request to the Payload REST API; a refused one throws a `BackendError`. */
async function send(
  path: string,
  { auth, headers, ...init }: Omit<RequestInit, 'cache'> & { auth?: BackendAuth },
): Promise<Response> {
  const { BACKEND_URL } = getServerEnv()
  if (!BACKEND_URL) throw new BackendError(0, 'No backend configured')

  const requestHeaders = new Headers(headers)
  const authorization = getAuthorization(auth)
  if (authorization) requestHeaders.set('Authorization', authorization)
  const response = await fetch(`${BACKEND_URL}/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: requestHeaders,
  })
  if (!response.ok) throw await readError(response)
  return response
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
  const response = await send(path, {
    method,
    auth,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return schema.parse(await response.json())
}

export type BackendFile = { bytes: ArrayBuffer; contentType: string }

/** Reads an upload's file through Payload's access-checked file route (ADR-0025 in the website). */
export async function backendFile({
  path,
  auth,
}: {
  path: string
  auth: BackendAuth
}): Promise<BackendFile> {
  const response = await send(path, { auth })
  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get('Content-Type') ?? 'application/octet-stream',
  }
}

export type BackendUpload<T> = {
  method?: 'POST' | 'PATCH'
  path: string
  auth: BackendAuth
  file: Blob
  filename: string
  /** The document's other fields, sent as Payload's `_payload` part. */
  data: Record<string, unknown>
  schema: z.ZodType<T>
}

/** Creates or replaces an upload's file, as Payload expects it: multipart with `file`. */
export async function backendUpload<T>({
  method = 'POST',
  path,
  auth,
  file,
  filename,
  data,
  schema,
}: BackendUpload<T>): Promise<T> {
  const form = new FormData()
  form.append('file', file, filename)
  form.append('_payload', JSON.stringify(data))
  const response = await send(path, {
    method,
    auth,
    headers: { Accept: 'application/json' },
    body: form,
  })
  return schema.parse(await response.json())
}

/** True for a refused session (expired or never valid) or a missing permission. */
export function isAccessError(error: unknown): boolean {
  return (
    error instanceof BackendError &&
    (error.status === HTTP_UNAUTHORIZED || error.status === HTTP_FORBIDDEN)
  )
}
