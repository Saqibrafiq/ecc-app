/**
 * The club's rules as pure functions (ADR-0005): practice days, the attendance rule and its
 * countdown, answer and selection deadlines, reminders, selection eligibility and squad
 * composition. No framework imports; every caller passes its own `today` / `now`, so the rules
 * are deterministic and fully tested.
 */
export {
  ATTENDANCE_WINDOW,
  type AttendanceInput,
  type AttendanceSlot,
  type AttendanceStanding,
  type AttendanceStatus,
  type Countdown,
  getAttendanceStatus,
  getCountdown,
  type PracticeOutcome,
  REQUIRED_PRACTICES,
  type TeamPractice,
} from './attendance'
export {
  type AvailabilityTarget,
  type AvailabilityTargetInput,
  AWAY_AVAILABILITY_SHARE,
  CAPTAIN_AVAILABILITY_SHARE,
  getAwayAvailabilityTarget,
  getCaptainAvailabilityTarget,
  type TargetStanding,
} from './availability-target'
export {
  type BorrowingCheck,
  type BorrowingInput,
  type BorrowingProblem,
  checkBorrowing,
} from './borrowing'
export {
  type DeadlineDay,
  DEFAULT_DEADLINE_DAY,
  getAvailabilityDeadline,
  getPracticeDeadline,
  getSelectionDeadline,
  isOpen,
  PRACTICE_ANSWER_LEAD_HOURS,
} from './deadlines'
export {
  type Eligibility,
  type EligibilityInput,
  type EligibilityOverride,
  type EligibilityVerdict,
  getEligibility,
  type IneligibilityReason,
  REASON_MOTIONS,
} from './eligibility'
export {
  addDays,
  CLUB_TIME_ZONE,
  daysBetween,
  endOfLocalDay,
  getLocalDate,
  getWeekday,
  isLocalDate,
  isLocalTime,
  type LocalDate,
  type LocalTime,
  startOfWeek,
  toInstant,
  toLocalDate,
  toLocalTime,
  type Weekday,
} from './local-time'
export {
  getPracticeDate,
  type PlannedPractice,
  planPractices,
  type TeamFixture,
} from './practice-day'
export { type MotionId, MOTIONS } from './motions'
export { getDueReminderDay, REMINDER_TIME, type ReminderInput } from './reminders'
export {
  checkSquad,
  getCarryOvers,
  PLAYING_XI_SIZE,
  type SquadCheck,
  type SquadCheckInput,
  type SquadPick,
  type SquadProblem,
  type SquadRole,
  TWELFTH_MEN,
} from './squad'
