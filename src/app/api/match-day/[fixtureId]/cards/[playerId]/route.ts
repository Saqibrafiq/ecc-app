import { cardResponse } from '@/features/match-day'

import { parseRouteId } from '../../../../../[locale]/route-id'

/** A selected player's Spielerpass card image, for the squad's captain and admins. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/api/match-day/[fixtureId]/cards/[playerId]'>,
) {
  const { fixtureId, playerId } = await params
  const fixture = parseRouteId(fixtureId)
  const player = parseRouteId(playerId)
  return fixture === null || player === null
    ? new Response(null, { status: 404 })
    : cardResponse(fixture, String(player))
}
