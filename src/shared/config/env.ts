import 'server-only'

import { z } from 'zod'

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value))

const serverEnvSchema = z
  .object({
    /** The club website (Payload CMS), e.g. http://localhost:3001 or the production URL. */
    BACKEND_URL: optionalString.pipe(z.url().optional()),
    /** API key of the app's service account (an admin), for system tasks such as planning practices. */
    BACKEND_SERVICE_API_KEY: optionalString,
    /** Development only: pins "now", e.g. 2027-05-03T08:00:00Z. Ignored in production. */
    APP_NOW: optionalString.pipe(z.iso.datetime().optional()),
  })
  .refine((env) => !env.BACKEND_URL || Boolean(env.BACKEND_SERVICE_API_KEY), {
    message: 'BACKEND_SERVICE_API_KEY is required when BACKEND_URL is set.',
    path: ['BACKEND_SERVICE_API_KEY'],
  })

export type ServerEnv = z.infer<typeof serverEnvSchema>

/**
 * Validates the server's environment, failing fast on a misconfiguration. Without `BACKEND_URL`
 * the app runs as a preview with sample data (local development, CI, Storybook).
 */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source)
  if (!result.success) {
    throw new Error(`Invalid server environment variables:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

let cached: ServerEnv | undefined

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env)
  return cached
}
