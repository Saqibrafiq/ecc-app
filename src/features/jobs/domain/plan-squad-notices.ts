import { getLocalDate } from '@/domain/club-rules'
import type { ScheduledEvent } from '@/features/week'

import type { DueNotification, SquadState, TickInput } from '../types'
import { captainsOf, players } from './recipients'

/** One step of a squad (submitted, returned, approved), versioned by when its status changed. */
type Step = { match: ScheduledEvent; version: string }

const keyOf = (kind: string, step: Step, userId: number) =>
  `${kind}:${step.match.id}:${step.version}:${String(userId)}`

/** UC-11: a handed-in squad waits for the Board. */
function toBoard(input: TickInput, step: Step): DueNotification[] {
  return input.members
    .filter((member) => member.isBoard)
    .map((member) => ({
      kind: 'approval',
      key: keyOf('approval', step, member.userId),
      userId: member.userId,
      match: step.match,
    }))
}

/** UC-11: a squad the Board sent back goes to its captain, who reads the note in the app. */
function toCaptains(input: TickInput, step: Step): DueNotification[] {
  return captainsOf(input.members, step.match.team.id).map((captain) => ({
    kind: 'returned',
    key: keyOf('returned', step, captain.userId),
    userId: captain.userId,
    match: step.match,
  }))
}

/**
 * UC-12: once the squad is announced, every player who said Going learns whether they were picked,
 * and in which role. Whoever was picked is told too, also a player borrowed from the other squad.
 */
function toPlayers(input: TickInput, squad: SquadState, step: Step): DueNotification[] {
  const roles = new Map(squad.picks.map((pick) => [pick.playerId, pick.role]))
  const recipients = new Set([...(input.going.get(step.match.id) ?? []), ...roles.keys()])
  return players(input.members)
    .filter((member) => recipients.has(member.playerId))
    .map((member) => ({
      kind: 'announcement',
      key: keyOf('announcement', step, member.userId),
      userId: member.userId,
      match: step.match,
      role: roles.get(member.playerId) ?? null,
    }))
}

/**
 * The notices a squad's last step calls for: the Board when the captain hands it in, the captain
 * when the Board sends it back, the players when it is announced (UC-11, UC-12). Each step is sent
 * once: its key carries the website's status stamp, so a squad submitted again after a return is a
 * new step. A match already played needs no notice.
 */
export function planSquadNotices(input: TickInput): DueNotification[] {
  const today = getLocalDate(input.now)
  return input.squads.flatMap((squad) => {
    const match = input.events.find((event) => event.id === squad.matchId)
    // Without its stamp, one step cannot be told from the next: better none than one too many.
    if (!match || squad.statusChangedAt === null || match.date < today) return []
    const step = { match, version: squad.statusChangedAt }
    switch (squad.status) {
      case 'submitted':
        return toBoard(input, step)
      case 'returned':
        return toCaptains(input, step)
      case 'approved':
        return toPlayers(input, squad, step)
      case 'open':
        return []
    }
  })
}
