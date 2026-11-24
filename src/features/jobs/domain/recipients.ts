import type { JobMember } from '../types'

/** The captains who lead a team: the ones its check-in, selection and returned squad go to. */
export function captainsOf(members: readonly JobMember[], teamId: string): JobMember[] {
  return members.filter((member) => member.captainOfTeamId === teamId)
}

/** The members linked to a player, with that player's id. */
export function players(members: readonly JobMember[]): (JobMember & { playerId: number })[] {
  return members.filter((member): member is JobMember & { playerId: number } => {
    return member.playerId !== null
  })
}
