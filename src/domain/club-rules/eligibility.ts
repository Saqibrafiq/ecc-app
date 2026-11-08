import type { AttendanceStanding } from './attendance'
import { type MotionId, MOTIONS } from './motions'

/** Why a player cannot be selected for a match. */
export type IneligibilityReason = 'attendance' | 'not-ecc1-eligible' | 'no-show'

/** The motion behind each reason, so the app can explain it to the player and the captain. */
export const REASON_MOTIONS: Record<IneligibilityReason, MotionId> = {
  attendance: MOTIONS.trainingAttendance,
  'not-ecc1-eligible': MOTIONS.newMembersUpperLeagues,
  'no-show': MOTIONS.twelfthMan,
}

/**
 * - `selectable`: the captain can pick the player.
 * - `conditional`: selectable only if they attend the practice still to come.
 * - `not-selectable`: the captain cannot pick them; only an admin exception can (R-8).
 */
export type EligibilityVerdict = 'selectable' | 'conditional' | 'not-selectable'

/** Why a player is selectable despite the rules: carried over from the last match, or an exception. */
export type EligibilityOverride = 'carry-over' | 'exception'

export type Eligibility = {
  verdict: EligibilityVerdict
  /** Every rule that blocks the player, also when an override sets it aside. */
  reasons: IneligibilityReason[]
  override: EligibilityOverride | null
}

export type EligibilityInput = {
  /** ECC I only selects players the admin has flagged as ECC I eligible (R-4, motion 2024/06). */
  isFirstTeam: boolean
  isEcc1Eligible: boolean
  attendance: AttendanceStanding
  /** Selected for the team's previous match but did not appear (R-14, motion 2023/10). */
  missedPreviousMatch: boolean
  /** Last match's 12th man or reserve: plays this match without any selection (R-13). */
  isCarriedOver: boolean
  /** The admin made the player selectable for this match (R-8). */
  hasException: boolean
}

function getReasons({
  isFirstTeam,
  isEcc1Eligible,
  attendance,
  missedPreviousMatch,
}: EligibilityInput): IneligibilityReason[] {
  const reasons: IneligibilityReason[] = []
  if (attendance === 'out') reasons.push('attendance')
  if (isFirstTeam && !isEcc1Eligible) reasons.push('not-ecc1-eligible')
  if (missedPreviousMatch) reasons.push('no-show')
  return reasons
}

function getOverride({
  isCarriedOver,
  hasException,
}: EligibilityInput): EligibilityOverride | null {
  if (isCarriedOver) return 'carry-over'
  return hasException ? 'exception' : null
}

/**
 * Whether a captain may select a player for a match, and if not, why (R-2, R-4, R-8, R-13, R-14).
 * Each reason maps to its motion through `REASON_MOTIONS`.
 */
export function getEligibility(input: EligibilityInput): Eligibility {
  const reasons = getReasons(input)
  const override = getOverride(input)
  if (override !== null) return { verdict: 'selectable', reasons, override }
  if (reasons.length > 0) return { verdict: 'not-selectable', reasons, override }
  if (input.attendance === 'possible') return { verdict: 'conditional', reasons, override }
  return { verdict: 'selectable', reasons, override }
}
