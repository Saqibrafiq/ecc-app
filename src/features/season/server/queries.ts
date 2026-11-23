import 'server-only'

import { getCurrentMember, getSessionToken } from '@/features/auth'
import { getPreviewNow } from '@/features/week'
import { isBackendConfigured } from '@/shared/backend/client'
import { getNow } from '@/shared/lib/clock'

import { buildSeason } from '../domain/build-season'
import type { Season } from '../types'
import { getBackendSeason } from './backend-season'
import { getSampleSeasonInput } from './sample-season'

export type SeasonResult =
  | {
      kind: 'season'
      season: Season
      /** True while the screen shows sample data (no backend configured). */
      isPreview: boolean
    }
  | { kind: 'signed-out' }

/**
 * The club's whole season for every signed-in member, linked to a player or not, or sample data
 * on the preview Monday when the app runs without a backend (local development, CI).
 */
export async function getMySeason(realNow: Date = getNow()): Promise<SeasonResult> {
  if (!isBackendConfigured()) {
    const season = buildSeason(getSampleSeasonInput(getPreviewNow(realNow)))
    return { kind: 'season', season, isPreview: true }
  }

  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member || !token) return { kind: 'signed-out' }

  const season = await getBackendSeason({ token, playerId: member.playerId }, realNow)
  return { kind: 'season', season, isPreview: false }
}
