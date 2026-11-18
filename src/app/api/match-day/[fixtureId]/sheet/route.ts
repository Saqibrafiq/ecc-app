import { matchSheetResponse } from '@/features/match-day'

import { parseRouteId } from '../../../../[locale]/route-id'

/** The filled DCB match report sheet of an approved squad, for its captain and admins. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/api/match-day/[fixtureId]/sheet'>,
) {
  const fixtureId = parseRouteId((await params).fixtureId)
  return fixtureId === null ? new Response(null, { status: 404 }) : matchSheetResponse(fixtureId)
}
