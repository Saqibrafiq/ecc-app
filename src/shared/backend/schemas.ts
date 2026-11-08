import { z } from 'zod'

/** A Payload list response, of which only the documents are used. */
export function listOf<T>(doc: z.ZodType<T>) {
  return z.object({ docs: z.array(doc) })
}

/** A relationship as Payload returns it: an id at depth 0, the document at depth ≥ 1. */
export const relationIdSchema = z.union([
  z.number(),
  z.object({ id: z.number() }).transform((value) => value.id),
])
