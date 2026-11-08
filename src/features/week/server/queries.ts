import 'server-only'

import { buildWeek } from '../domain/build-week'
import type { MyWeek } from '../types'
import { getPreviewNow, getSampleWeekInput } from './sample-week'

export type WeekResult = {
  week: MyWeek
  /** True while the screen shows sample data (until it is connected to the backend). */
  isPreview: boolean
}

/** The signed-in member's week. For now sample data on a preview Monday. */
export function getMyWeek(realNow: Date = new Date()): WeekResult {
  return { week: buildWeek(getSampleWeekInput(getPreviewNow(realNow))), isPreview: true }
}
