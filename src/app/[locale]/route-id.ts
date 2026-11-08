import { z } from 'zod'

const routeIdSchema = z.coerce.number().int().positive()

/** A backend id from the URL, or `null` for anything that is not one (fail fast, no request). */
export function parseRouteId(value: string): number | null {
  const parsed = routeIdSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
