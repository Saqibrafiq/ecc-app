import type { SquadStatus } from '@/features/team'

/** The colour of a squad's state on the Board's screens. */
export const STATUS_CLASS: Record<SquadStatus, string> = {
  open: 'text-text-muted',
  submitted: 'text-accent-match',
  returned: 'text-status-missed-text',
  approved: 'text-status-going-text',
}
