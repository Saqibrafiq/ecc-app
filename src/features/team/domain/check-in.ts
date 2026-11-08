import type { Answer } from '@/features/week'

/** A stored attendance record of one player at one practice. */
export type AttendanceRecord = { id: number; playerId: string; attended: boolean }

export type CheckInChange =
  | { kind: 'create'; playerId: string; isWalkIn: boolean }
  | { kind: 'update'; recordId: number; attended: boolean }

export type CheckInPlanInput = {
  records: readonly AttendanceRecord[]
  presentIds: ReadonlySet<string>
  playerIds: readonly string[]
  answers: ReadonlyMap<string, Answer>
}

/**
 * The attendance writes a check-in needs: a record for each newly present player (a walk-in if
 * they had not said Going), and a flip for each record that changed. Nothing is deleted, so a
 * correction keeps its history (UC-18).
 */
export function planCheckIn({
  records,
  presentIds,
  playerIds,
  answers,
}: CheckInPlanInput): CheckInChange[] {
  const byPlayer = new Map(records.map((record) => [record.playerId, record]))
  const changes: CheckInChange[] = []
  for (const playerId of playerIds) {
    const record = byPlayer.get(playerId)
    const isPresent = presentIds.has(playerId)
    if (!record) {
      if (isPresent) {
        changes.push({ kind: 'create', playerId, isWalkIn: answers.get(playerId) !== 'going' })
      }
    } else if (record.attended !== isPresent) {
      changes.push({ kind: 'update', recordId: record.id, attended: isPresent })
    }
  }
  return changes
}

/** Who starts ticked: the recorded attendance, or, before the first check-in, who said Going. */
export function isInitiallyPresent(
  record: AttendanceRecord | undefined,
  answer: Answer | null,
  isRecorded: boolean,
): boolean {
  if (record) return record.attended
  return !isRecorded && answer === 'going'
}
