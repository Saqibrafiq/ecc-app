import 'server-only'

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { type PDFFont, PDFDocument, rgb, StandardFonts } from 'pdf-lib'

import {
  fitText,
  getRowBaseline,
  HEADER_FIELDS,
  NAME_COLUMN,
  PASS_COLUMN,
  type SheetBlock,
  type TextBox,
} from '../domain/sheet-layout'
import type { SheetRow } from '../domain/sheet-rows'

/** The blank official form (a public DCB document), traced into the route (next.config). */
const TEMPLATE_PATH = path.join(process.cwd(), 'assets', 'dcb-match-report-sheet-2015.pdf')
const INK = rgb(0.05, 0.1, 0.35)

export type MatchSheet = {
  /** As written on the sheet, e.g. "14.11.2026". */
  date: string
  ground: string
  championship: string
  division: string
  /** ECC's block: Heimmannschaft or Auswärtsmannschaft. */
  block: SheetBlock
  rows: SheetRow[]
}

/**
 * The standard PDF font covers Western European letters (WinAnsi), not every name: a letter it
 * cannot draw falls back to its base letter ("ş" → "s"), or "?" as a last resort.
 */
function toDrawable(font: PDFFont, text: string): string {
  return Array.from(new Intl.Segmenter().segment(text), ({ segment }) => segment)
    .map((char) => {
      if (canDraw(font, char)) return char
      const base = char.normalize('NFD').replace(/\p{M}/gu, '')
      return base && canDraw(font, base) ? base : '?'
    })
    .join('')
}

function canDraw(font: PDFFont, char: string): boolean {
  try {
    font.encodeText(char)
    return true
  } catch {
    return false
  }
}

/**
 * Fills ECC's details into the official DCB match report sheet (ADR-0007): date, ground,
 * championship, division and ECC's block. The opponent, toss, umpires, result and signatures
 * stay empty for match day.
 */
export async function renderMatchSheet(sheet: MatchSheet): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(await readFile(TEMPLATE_PATH))
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const [page] = pdf.getPages()
  if (!page) throw new Error('The DCB match report sheet has no page')

  const write = (value: string, box: TextBox) => {
    const drawable = toDrawable(font, value.trim())
    if (drawable === '') return
    const { text, size } = fitText(drawable, box.maxWidth, (t, s) => font.widthOfTextAtSize(t, s))
    page.drawText(text, { x: box.x, y: box.y, size, font, color: INK })
  }

  write(sheet.date, HEADER_FIELDS.date)
  write(sheet.ground, HEADER_FIELDS.ground)
  write(sheet.championship, HEADER_FIELDS.championship)
  write(sheet.division, HEADER_FIELDS.division)
  for (const row of sheet.rows) {
    const y = getRowBaseline(sheet.block, row.label)
    write(row.registeredName, { ...NAME_COLUMN, y })
    write(row.passNumber, { ...PASS_COLUMN, y })
  }

  pdf.setTitle(`DCB-Spielberichtsbogen ${sheet.date}`)
  pdf.setProducer('ECC App')
  return pdf.save()
}
