import 'server-only'

import { getTeamAccess, type TeamActor } from '@/features/team'
import { backendFile, isAccessError, isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

import { loadMatchDay, type MatchDayData } from './backend-match-day'
import { renderMatchSheet } from './render-sheet'

const HTTP = { unauthorized: 401, notFound: 404, conflict: 409, error: 500 } as const
/** Personal data: never kept by shared caches or the browser's back-forward cache. */
const PRIVATE = { 'Cache-Control': 'private, no-store' } as const

const status = (code: number) => new Response(null, { status: code, headers: PRIVATE })

/**
 * Runs a match-day file request: the caller must be the team's captain or an admin, and the squad
 * approved; every file is checked again here, so a link alone grants nothing (ADR-0007).
 */
async function withMatchDay(
  fixtureId: number,
  respond: (data: MatchDayData, actor: TeamActor) => Promise<Response>,
): Promise<Response> {
  if (!isBackendConfigured()) return status(HTTP.notFound)
  const access = await getTeamAccess()
  if (access.kind !== 'allowed') return status(HTTP.unauthorized)
  try {
    const load = await loadMatchDay(access.actor, fixtureId, getNow())
    if (!load) return status(HTTP.notFound)
    if (load.kind === 'not-approved') return status(HTTP.conflict)
    return await respond(load.data, access.actor)
  } catch (error) {
    if (isAccessError(error)) return status(HTTP.unauthorized)
    logError('Serving a match-day file failed', error)
    return status(HTTP.error)
  }
}

function fileResponse(bytes: ArrayBuffer | Uint8Array, contentType: string, disposition?: string) {
  return new Response(bytes as BodyInit, {
    headers: {
      ...PRIVATE,
      'Content-Type': contentType,
      ...(disposition ? { 'Content-Disposition': disposition } : {}),
    },
  })
}

/** The DCB match report sheet with ECC's block filled in, as a PDF download (UC-21). */
export function matchSheetResponse(fixtureId: number): Promise<Response> {
  return withMatchDay(fixtureId, async (data) => {
    const bytes = await renderMatchSheet(data.sheet)
    const filename = `DCB-Spielberichtsbogen-${data.sheet.date}.pdf`
    return fileResponse(bytes, 'application/pdf', `attachment; filename="${filename}"`)
  })
}

/** A selected player's Spielerpass card image (UC-13), read as the service account. */
export function cardResponse(fixtureId: number, playerId: string): Promise<Response> {
  return withMatchDay(fixtureId, async (data) => {
    const filename = data.cards.get(playerId)
    if (!filename) return status(HTTP.notFound)
    const file = await backendFile({
      path: `/spielerpass-cards/file/${encodeURIComponent(filename)}`,
      auth: { as: 'service' },
    })
    return fileResponse(file.bytes, file.contentType)
  })
}

/** The uploaded photo of the signed sheet (UC-22), read as the captain or admin. */
export function signedSheetResponse(fixtureId: number): Promise<Response> {
  return withMatchDay(fixtureId, async (data, actor) => {
    if (!data.signedSheet) return status(HTTP.notFound)
    const file = await backendFile({
      path: `/match-sheets/file/${encodeURIComponent(data.signedSheet.filename)}`,
      auth: { as: 'member', token: actor.token },
    })
    return fileResponse(file.bytes, file.contentType)
  })
}
