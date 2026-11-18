import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sheet: vi.fn(() => new Response('pdf')),
  card: vi.fn(() => new Response('card')),
  signed: vi.fn(() => new Response('signed')),
}))

vi.mock('@/features/match-day', () => ({
  matchSheetResponse: mocks.sheet,
  cardResponse: mocks.card,
  signedSheetResponse: mocks.signed,
}))

const { GET: getSheet } = await import('./[fixtureId]/sheet/route')
const { GET: getCard } = await import('./[fixtureId]/cards/[playerId]/route')
const { GET: getSigned } = await import('./[fixtureId]/signed-sheet/route')

const request = new Request('http://app.test')
const params = <T>(value: T) => ({ params: Promise.resolve(value) })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('match-day file routes', () => {
  it('pass a valid match and player on to the feature', async () => {
    await getSheet(request, params({ fixtureId: '60' }))
    await getCard(request, params({ fixtureId: '60', playerId: '114' }))
    await getSigned(request, params({ fixtureId: '60' }))

    expect(mocks.sheet).toHaveBeenCalledWith(60)
    expect(mocks.card).toHaveBeenCalledWith(60, '114')
    expect(mocks.signed).toHaveBeenCalledWith(60)
  })

  it('answer not found for ids that are not ids, without asking the backend', async () => {
    expect((await getSheet(request, params({ fixtureId: 'x' }))).status).toBe(404)
    expect((await getCard(request, params({ fixtureId: '60', playerId: '../1' }))).status).toBe(404)
    expect((await getSigned(request, params({ fixtureId: '-1' }))).status).toBe(404)
    expect(mocks.sheet).not.toHaveBeenCalled()
    expect(mocks.card).not.toHaveBeenCalled()
    expect(mocks.signed).not.toHaveBeenCalled()
  })
})
