import 'server-only'

import { getCurrentMember, getSessionToken } from '@/features/auth'
import { isBackendConfigured } from '@/shared/backend/client'

import type { Profile } from '../types'
import { getBackendProfile } from './backend-profile'

export type ProfileResult =
  { kind: 'profile'; profile: Profile; isPreview: boolean } | { kind: 'signed-out' }

/** The preview's member: the same sample captain as on the other screens. */
const PREVIEW_PROFILE: Profile = {
  name: 'Saqib Rafiq',
  email: 'saqib@example.com',
  role: 'captain',
  teamName: 'ECC I',
  captainOfName: 'ECC I',
  playerName: 'Saqib Rafiq',
}

/** The signed-in member's profile, or the sample member in the preview. */
export async function getMyProfile(): Promise<ProfileResult> {
  if (!isBackendConfigured()) return { kind: 'profile', profile: PREVIEW_PROFILE, isPreview: true }
  const [member, token] = await Promise.all([getCurrentMember(), getSessionToken()])
  if (!member || !token) return { kind: 'signed-out' }
  return { kind: 'profile', profile: await getBackendProfile(member, token), isPreview: false }
}
