import { describe, expect, it } from 'vitest'

import {
  FONT_SIZE,
  fitText,
  getRowBaseline,
  HEADER_FIELDS,
  NAME_COLUMN,
  PAGE,
  PASS_COLUMN,
} from './sheet-layout'
import { buildSheetRows, SHEET_ROW_LABELS } from './sheet-rows'

const IDS = Array.from({ length: 13 }, (_, index) => String(index + 1))
const PICKS = [
  ...IDS.slice(0, 11).map((playerId) => ({ playerId, role: 'playing' as const })),
  { playerId: '12', role: 'twelfth' as const },
  { playerId: '13', role: 'reserve' as const },
  { playerId: '14', role: 'reserve' as const },
]
const PASSES = new Map(
  IDS.map((id) => [id, { registeredName: `Player ${id} Registered`, passNumber: `P-${id}` }]),
)

describe('buildSheetRows', () => {
  it('puts the XI in rows 1–11, the 12th man in A1, the first reserve in A2', () => {
    const { rows, missingPasses } = buildSheetRows(PICKS, PASSES, {})

    expect(rows.map((row) => [row.label, row.playerId])).toEqual([
      ...IDS.slice(0, 11).map((id) => [id, id]),
      ['A1', '12'],
      ['A2', '13'],
      ['B1', null],
      ['B2', null],
    ])
    expect(rows[0]).toEqual({
      label: '1',
      playerId: '1',
      registeredName: 'Player 1 Registered',
      passNumber: 'P-1',
    })
    expect(rows[13]).toEqual({ label: 'B1', playerId: null, registeredName: '', passNumber: '' })
    expect(missingPasses).toEqual([])
  })

  it('keeps a player without a pass on the sheet by name, and flags them', () => {
    const passes = new Map(PASSES)
    passes.delete('3')

    const { rows, missingPasses } = buildSheetRows(PICKS, passes, { '3': 'Bilal Mir' })

    expect(rows[2]).toMatchObject({ registeredName: 'Bilal Mir', passNumber: '' })
    expect(missingPasses).toEqual([{ playerId: '3', name: 'Bilal Mir' }])
  })

  it('leaves rows empty for a short squad, and names an unknown player blank', () => {
    const { rows, missingPasses } = buildSheetRows(
      [{ playerId: '99', role: 'playing' }],
      new Map(),
      {},
    )

    expect(rows.filter((row) => row.playerId !== null)).toHaveLength(1)
    expect(rows[0]?.registeredName).toBe('')
    expect(missingPasses).toEqual([{ playerId: '99', name: '' }])
  })
})

describe('the sheet layout', () => {
  it('aligns each row with its printed label', () => {
    expect(getRowBaseline('home', '1')).toBe(671)
    expect(getRowBaseline('home', 'B2')).toBe(430)
    expect(getRowBaseline('away', '1')).toBe(379)
    expect(Math.round(getRowBaseline('away', '6'))).toBe(293)
    expect(Math.round(getRowBaseline('away', 'A1'))).toBe(190)
  })

  it('keeps every box on the page and the two columns apart', () => {
    const boxes = [
      ...Object.values(HEADER_FIELDS),
      ...SHEET_ROW_LABELS.flatMap((label) =>
        (['home', 'away'] as const).flatMap((block) => [
          { ...NAME_COLUMN, y: getRowBaseline(block, label) },
          { ...PASS_COLUMN, y: getRowBaseline(block, label) },
        ]),
      ),
    ]
    for (const box of boxes) {
      expect(box.x + box.maxWidth).toBeLessThanOrEqual(PAGE.width)
      expect(box.y).toBeGreaterThan(0)
      expect(box.y).toBeLessThan(PAGE.height)
    }
    expect(NAME_COLUMN.x + NAME_COLUMN.maxWidth).toBeLessThan(PASS_COLUMN.x)
  })
})

describe('fitText', () => {
  /** A monospace stand-in: every character is half the font size wide. */
  const measure = (text: string, size: number) => text.length * size * 0.5

  it('keeps the default size when the text fits', () => {
    expect(fitText('Ali Shaan', 100, measure)).toEqual({
      text: 'Ali Shaan',
      size: FONT_SIZE.default,
    })
  })

  it('shrinks the font for a longer text', () => {
    const fitted = fitText('Ganesh Venkata Rao', 60, measure)

    expect(fitted.text).toBe('Ganesh Venkata Rao')
    expect(fitted.size).toBeLessThan(FONT_SIZE.default)
    expect(measure(fitted.text, fitted.size)).toBeLessThanOrEqual(60)
  })

  it('shortens with an ellipsis what does not fit even at the smallest size', () => {
    const fitted = fitText('Tawananyasha Nathan Mwashita', 30, measure)

    expect(fitted.size).toBe(FONT_SIZE.min)
    expect(fitted.text.endsWith('…')).toBe(true)
    expect(measure(fitted.text, fitted.size)).toBeLessThanOrEqual(30)
  })
})
