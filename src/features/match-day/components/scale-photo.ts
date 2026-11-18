import { fitWithin } from '../domain/signed-sheet'

const JPEG_QUALITY = 0.85

/**
 * A phone photo scaled in the browser to the size the sheet needs, as JPEG, so the upload stays
 * small (Vercel refuses request bodies over 4.5 MB). Without canvas support, the original file.
 */
export async function scalePhoto(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
  })
  return blob ? new File([blob], 'signed-sheet.jpg', { type: 'image/jpeg' }) : file
}
