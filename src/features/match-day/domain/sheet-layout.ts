import { SHEET_ROW_LABELS, type SheetRowLabel } from './sheet-rows'

/**
 * Where ECC's details go on the DCB match report sheet (the 2015 form, A4, PDF points from the
 * bottom-left corner), measured from the form's own labels (ADR-0007). If the DCB changes the
 * form, only this module changes (risk R-7).
 */

export const PAGE = { width: 595.2, height: 841.68 } as const

export type TextBox = { x: number; y: number; maxWidth: number }

/** The header's value boxes, right of their printed labels. */
export const HEADER_FIELDS = {
  date: { x: 264, y: 774, maxWidth: 140 },
  ground: { x: 442, y: 774, maxWidth: 130 },
  championship: { x: 299, y: 756, maxWidth: 105 },
  division: { x: 474, y: 756, maxWidth: 98 },
} as const satisfies Record<string, TextBox>

export type SheetBlock = 'home' | 'away'

/** The baseline of the first row ("1") of each team's block. */
const FIRST_ROW_BASELINE: Record<SheetBlock, number> = { home: 671, away: 379 }
/** Rows are evenly spaced: B2 sits 241 points below row 1 in both blocks. */
const ROW_PITCH = 241 / (SHEET_ROW_LABELS.length - 1)

export const NAME_COLUMN = { x: 266, maxWidth: 160 } as const
export const PASS_COLUMN = { x: 435, maxWidth: 136 } as const

/** The baseline of a row in a team's block, aligned with the row's printed label. */
export function getRowBaseline(block: SheetBlock, label: SheetRowLabel): number {
  return FIRST_ROW_BASELINE[block] - SHEET_ROW_LABELS.indexOf(label) * ROW_PITCH
}

/** The default and smallest readable font size, in points. */
export const FONT_SIZE = { default: 10, min: 6 } as const
const ELLIPSIS = '…'

/** Measures a text's width at a font size, e.g. with the PDF font's metrics. */
export type MeasureText = (text: string, size: number) => number

/**
 * The text and size that fit a box: the default size if it fits, else smaller down to the minimum,
 * else shortened with an ellipsis at the minimum. Nothing ever overflows into the next box.
 */
export function fitText(
  text: string,
  maxWidth: number,
  measure: MeasureText,
): { text: string; size: number } {
  for (let size: number = FONT_SIZE.default; size >= FONT_SIZE.min; size -= 0.5) {
    if (measure(text, size) <= maxWidth) return { text, size }
  }
  let shortened = text
  while (shortened.length > 0 && measure(`${shortened}${ELLIPSIS}`, FONT_SIZE.min) > maxWidth) {
    shortened = shortened.slice(0, -1)
  }
  return { text: `${shortened.trimEnd()}${ELLIPSIS}`, size: FONT_SIZE.min }
}
