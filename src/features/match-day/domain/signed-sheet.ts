/**
 * The largest signed-sheet photo the server accepts. The browser scales the photo down first
 * (`SHEET_MAX_EDGE`), and Vercel refuses request bodies over 4.5 MB in any case.
 */
export const MAX_SHEET_BYTES = 4 * 1024 * 1024

/** The longest edge, in pixels, a photo is scaled to before upload: the sheet stays legible. */
export const SHEET_MAX_EDGE = 1600

/** Photo formats the website accepts and scales (website ADR-0025). */
export const SHEET_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** The size a photo is scaled to so that its longest edge is at most `maxEdge`, never enlarged. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = SHEET_MAX_EDGE,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}
