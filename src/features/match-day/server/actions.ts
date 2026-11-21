'use server'

import { z } from 'zod'

import { getTeamAccess } from '@/features/team'
import { backendUpload, isAccessError } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import { MAX_SHEET_BYTES, SHEET_TYPES } from '../domain/signed-sheet'
import type { SignedSheetOutcome } from '../types'
import { loadMatchDay } from './backend-match-day'

const formSchema = z.object({
  fixtureId: z.coerce.number().int().positive(),
  sheet: z
    .instanceof(File)
    .refine((file) => file.size > 0 && file.size <= MAX_SHEET_BYTES)
    .refine((file) => (SHEET_TYPES as readonly string[]).includes(file.type)),
})

/**
 * Uploads a photo of the signed DCB match report sheet after the match (UC-22), as the team's
 * captain or an admin; a new photo replaces the earlier one. Only admins and that team's captain
 * can see it (ADR-0007, website ADR-0025).
 */
export async function uploadSignedSheetAction(
  form: FormData,
): Promise<{ status: SignedSheetOutcome }> {
  const parsed = formSchema.safeParse({
    fixtureId: form.get('fixtureId'),
    sheet: form.get('sheet'),
  })
  if (!parsed.success) return { status: 'invalid' }
  const access = await getTeamAccess()
  if (access.kind !== 'allowed') return { status: 'unauthorized' }
  const { fixtureId, sheet } = parsed.data
  const auth = { as: 'member', token: access.actor.token } as const

  try {
    const load = await loadMatchDay(access.actor, fixtureId, getNow())
    if (!load) return { status: 'invalid' }
    if (load.kind === 'not-approved') return { status: 'not-approved' }
    const existing = load.data.signedSheet
    await backendUpload({
      method: existing ? 'PATCH' : 'POST',
      path: existing ? `/match-sheets/${String(existing.id)}` : '/match-sheets',
      auth,
      file: sheet,
      filename: `signed-sheet-${String(fixtureId)}.${sheet.type.split('/')[1] ?? 'jpg'}`,
      data: existing ? {} : { fixture: fixtureId, team: load.data.teamId },
      schema: z.unknown(),
    })
    return { status: 'uploaded' }
  } catch (error) {
    if (isAccessError(error)) return { status: 'unauthorized' }
    logError('Uploading a signed match sheet failed', error)
    return { status: 'error' }
  }
}
