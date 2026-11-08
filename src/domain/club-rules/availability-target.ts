import { type MotionId, MOTIONS } from './motions'

/** Motion 2023/06: every player is available for at least half of the away matches. */
export const AWAY_AVAILABILITY_SHARE = 0.5
/** Motion 2023/05: captains and vice-captains are available for at least 80 % of the season. */
export const CAPTAIN_AVAILABILITY_SHARE = 0.8

export type AvailabilityTargetInput = {
  /** Closed matches the member answered Going for. */
  available: number
  /** Matches whose answers have closed; no answer counts as not available. */
  closed: number
  /** Matches still to come this season. */
  upcoming: number
}

/**
 * - `met`: the share is reached for the whole season, whatever happens next.
 * - `on-track`: reachable if the member is available for `stillNeeded` of the upcoming matches.
 * - `missed`: can no longer be reached this season.
 */
export type TargetStanding = 'met' | 'on-track' | 'missed'

export type AvailabilityTarget = {
  motion: MotionId
  share: number
  /** Matches the member must be available for over the whole season. */
  required: number
  available: number
  stillNeeded: number
  upcoming: number
  standing: TargetStanding
}

function getTarget(
  motion: MotionId,
  share: number,
  { available, closed, upcoming }: AvailabilityTargetInput,
): AvailabilityTarget {
  const required = Math.ceil(share * (closed + upcoming))
  const stillNeeded = Math.max(0, required - available)
  let standing: TargetStanding = 'missed'
  if (stillNeeded === 0) standing = 'met'
  else if (stillNeeded <= upcoming) standing = 'on-track'
  return { motion, share, required, available, stillNeeded, upcoming, standing }
}

/**
 * A player's standing on away matches this season (R-15, motion 2023/06), e.g. "be available for
 * 2 of the remaining 4 away matches".
 */
export function getAwayAvailabilityTarget(input: AvailabilityTargetInput): AvailabilityTarget {
  return getTarget(MOTIONS.awayAvailability, AWAY_AVAILABILITY_SHARE, input)
}

/** A captain's or vice-captain's standing on all matches this season (R-15, motion 2023/05). */
export function getCaptainAvailabilityTarget(input: AvailabilityTargetInput): AvailabilityTarget {
  return getTarget(MOTIONS.captainAvailability, CAPTAIN_AVAILABILITY_SHARE, input)
}
