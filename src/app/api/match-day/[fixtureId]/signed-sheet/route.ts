import { signedSheetResponse } from '@/features/match-day'

import { parseRouteId } from '../../../../[locale]/route-id'

/** The photo of the signed match report sheet, for the squad's captain and admins. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/api/match-day/[fixtureId]/signed-sheet'>,
) {
  const fixtureId = parseRouteId((await params).fixtureId)
  return fixtureId === null ? new Response(null, { status: 404 }) : signedSheetResponse(fixtureId)
}
