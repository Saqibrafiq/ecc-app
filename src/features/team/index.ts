export { CheckInView, type CheckInViewProps } from './components/check-in-view'
export { SquadSelectionView, type SquadSelectionViewProps } from './components/squad-selection-view'
export { TeamAccessState, type TeamAccessStateProps } from './components/team-access-state'
export { TeamWeekView, type TeamWeekViewProps } from './components/team-week-view'
export { decideCorrectionAction, saveCheckInAction, submitSquadAction } from './server/actions'
export { loadSelection, type SelectionData } from './server/backend-team'
export { getSampleSelection, getTeamPreviewNow, SAMPLE_FIXTURE_ID } from './server/sample-team'
export { getTeamAccess, type TeamActor } from './server/team-access'
export {
  type CheckInResult,
  getCheckIn,
  getSquadSelection,
  getTeamWeek,
  isTeamCaptain,
  type SelectionResult,
  type TeamWeekResult,
} from './server/queries'
export type { Candidate, CheckIn, SquadSelection, SquadStatus, TeamWeek } from './types'
