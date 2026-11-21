// @vitest-environment node
// PDF rendering is server code: jsdom's typed arrays do not pass pdf-lib's checks.
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'

import { buildSheetRows } from '../domain/sheet-rows'

vi.mock('server-only', () => ({}))

const { renderMatchSheet } = await import('./render-sheet')

const PICKS = Array.from({ length: 12 }, (_, index) => ({
  playerId: String(index + 1),
  role: index < 11 ? ('playing' as const) : ('twelfth' as const),
}))
const PASSES = new Map(
  PICKS.map(({ playerId }) => [
    playerId,
    { registeredName: `Spieler ${playerId} Müller-Şahin`, passNumber: `BY-2026-${playerId}` },
  ]),
)

describe('renderMatchSheet', () => {
  it('fills the one-page official sheet for either block', async () => {
    for (const block of ['home', 'away'] as const) {
      const bytes = await renderMatchSheet({
        date: '14.11.2026',
        ground: 'Nürnberg – Pitch 1',
        championship: 'BCV Meisterschaft 2026',
        division: 'Regionalliga Bayern, Gruppe Nord mit sehr langem Namen',
        block,
        rows: buildSheetRows(PICKS, PASSES, {}).rows,
      })

      const pdf = await PDFDocument.load(bytes)
      expect(pdf.getPageCount()).toBe(1)
      expect(pdf.getTitle()).toBe('DCB-Spielberichtsbogen 14.11.2026')
      expect(bytes.byteLength).toBeGreaterThan(100_000)
    }
  })

  it('draws an empty sheet without failing', async () => {
    const bytes = await renderMatchSheet({
      date: '',
      ground: '',
      championship: '',
      division: '',
      block: 'home',
      rows: buildSheetRows([], new Map(), {}).rows,
    })

    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
  })
})
