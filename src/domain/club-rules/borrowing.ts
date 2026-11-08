import { PLAYING_XI_SIZE } from './squad'

/** Why a player from another squad cannot be borrowed (R-16, motion 2026/02 (4)). */
export type BorrowingProblem = 'own-squad-can-field-xi' | 'other-captain-not-agreed'

export type BorrowingInput = {
  /** Players of the borrowing team's own squad who said Going and can be selected. */
  ownAvailable: number
  /** The captain of the player's own squad has agreed. */
  hasOtherCaptainAgreed: boolean
}

export type BorrowingCheck = {
  isAllowed: boolean
  problems: BorrowingProblem[]
}

/**
 * Whether a captain may pick a player from the other squad (R-16, motion 2026/02 (4)): only when
 * their own squad cannot field an XI, and only with the other captain's agreement.
 */
export function checkBorrowing({
  ownAvailable,
  hasOtherCaptainAgreed,
}: BorrowingInput): BorrowingCheck {
  const problems: BorrowingProblem[] = []
  if (ownAvailable >= PLAYING_XI_SIZE) problems.push('own-squad-can-field-xi')
  if (!hasOtherCaptainAgreed) problems.push('other-captain-not-agreed')
  return { isAllowed: problems.length === 0, problems }
}
