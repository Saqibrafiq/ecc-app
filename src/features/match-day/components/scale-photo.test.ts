import { afterEach, describe, expect, it, vi } from 'vitest'

import { scalePhoto } from './scale-photo'

const photo = new File(['raw'], 'IMG_0001.jpg', { type: 'image/jpeg' })

function stubBitmap() {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(() => Promise.resolve({ width: 4032, height: 3024, close })),
  )
  return close
}

function stubCanvas(blob: Blob | null, hasContext = true) {
  const drawImage = vi.fn()
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => (hasContext ? { drawImage } : null),
    toBlob: (done: (result: Blob | null) => void) => {
      done(blob)
    },
  }
  // scalePhoto creates nothing but its canvas.
  vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement)
  return { canvas, drawImage }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('scalePhoto', () => {
  it('scales a phone photo down and sends it as JPEG', async () => {
    const close = stubBitmap()
    const { canvas, drawImage } = stubCanvas(new Blob(['small'], { type: 'image/jpeg' }))

    const scaled = await scalePhoto(photo)

    expect([canvas.width, canvas.height]).toEqual([1600, 1200])
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200)
    expect(close).toHaveBeenCalled()
    expect(scaled).toMatchObject({ name: 'signed-sheet.jpg', type: 'image/jpeg' })
  })

  it('keeps the original where the browser cannot scale it', async () => {
    await expect(scalePhoto(photo)).resolves.toBe(photo)

    stubBitmap()
    stubCanvas(null, false)
    await expect(scalePhoto(photo)).resolves.toBe(photo)

    vi.restoreAllMocks()
    stubCanvas(null)
    await expect(scalePhoto(photo)).resolves.toBe(photo)
  })
})
