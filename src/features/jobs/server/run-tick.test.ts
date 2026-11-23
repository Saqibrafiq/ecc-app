import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

type Mocks = {
  load: Mock
  plan: Mock
  subscriptions: Mock
  send: Mock
  logged: Mock
  claim: Mock
}

const mocks = vi.hoisted<Mocks>(() => ({
  load: vi.fn(),
  plan: vi.fn(),
  subscriptions: vi.fn(),
  send: vi.fn(),
  logged: vi.fn(),
  claim: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => ({
  getTranslations: ({ locale }: { locale: string }) =>
    Promise.resolve((key: string) => `${locale}:${key}`),
  getFormatter: () =>
    Promise.resolve({
      dateTime: () => 'Saturday',
      list: (items: string[]) => items.join(' + '),
    }),
}))
vi.mock('./load-tick-data', () => ({ loadTickData: mocks.load }))
vi.mock('../domain/plan-notifications', () => ({ planNotifications: mocks.plan }))
vi.mock('./notification-log', () => ({
  findLoggedKeys: mocks.logged,
  claimNotification: mocks.claim,
}))
vi.mock('@/features/notifications', () => ({
  getSubscriptions: mocks.subscriptions,
  sendPush: mocks.send,
}))

const { runTick } = await import('./run-tick')

const NOW = new Date('2026-11-09T11:00:00Z')
const MATCH = {
  id: 'fixture-60',
  kind: 'match',
  team: { id: '1', name: 'ECC I' },
  date: '2026-11-14',
  startTime: '11:00',
  ground: 'Nürnberg',
  opponent: 'NCC-I',
}
const reminder = (userId: number) => ({
  kind: 'reminder',
  key: `reminder:2026-11-09:${String(userId)}`,
  userId,
  events: [MATCH],
})
const device = (id: number, userId: number, locale: 'en' | 'de') => ({
  id,
  userId,
  locale,
  endpoint: `https://push.example/${String(id)}`,
  keys: { p256dh: 'p', auth: 'a' },
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.load.mockResolvedValue({ snapshot: true })
  mocks.plan.mockReturnValue([reminder(1), reminder(2), reminder(3), reminder(4)])
  mocks.plan.mockReturnValueOnce([
    { ...reminder(1), events: [MATCH, { ...MATCH, id: 'practice-7', kind: 'practice' }] },
    reminder(2),
    reminder(3),
    reminder(4),
  ])
  mocks.subscriptions.mockResolvedValue([
    device(10, 1, 'en'),
    device(11, 1, 'de'),
    device(12, 2, 'en'),
    device(13, 3, 'en'),
  ])
  mocks.logged.mockResolvedValue(new Set(['reminder:2026-11-09:2']))
  mocks.claim.mockImplementation((key: string) => Promise.resolve(!key.endsWith(':3')))
  mocks.send.mockImplementation((devices: unknown[]) =>
    Promise.resolve({ sent: devices.length, expired: 0, failed: 0 }),
  )
})

describe('runTick', () => {
  it('plans from the week as it stands now', async () => {
    await runTick(NOW)

    expect(mocks.load).toHaveBeenCalledWith(NOW)
    expect(mocks.plan).toHaveBeenCalledWith({ snapshot: true })
    expect(mocks.subscriptions).toHaveBeenCalledWith([1, 2, 3, 4])
  })

  it('sends each due notification once: not again, not when another tick claimed it, not without a device', async () => {
    const report = await runTick(NOW)

    expect(report).toEqual({
      due: 4,
      alreadySent: 2,
      sent: 1,
      deliveries: { sent: 2, expired: 0, failed: 0 },
    })
    expect(mocks.logged).toHaveBeenCalledWith([
      'reminder:2026-11-09:1',
      'reminder:2026-11-09:2',
      'reminder:2026-11-09:3',
    ])
    expect(mocks.claim.mock.calls).toEqual([
      ['reminder:2026-11-09:1', 'reminder', 1],
      ['reminder:2026-11-09:3', 'reminder', 3],
    ])
  })

  it("sends to each device in that device's language", async () => {
    await runTick(NOW)

    expect(mocks.send).toHaveBeenCalledTimes(2)
    expect(mocks.send).toHaveBeenCalledWith(
      [device(10, 1, 'en')],
      expect.objectContaining({ title: 'en:reminder.title' }),
    )
    expect(mocks.send).toHaveBeenCalledWith(
      [device(11, 1, 'de')],
      expect.objectContaining({ title: 'de:reminder.title' }),
    )
  })

  it('adds up the deliveries, expired and failed included', async () => {
    mocks.send
      .mockResolvedValueOnce({ sent: 0, expired: 1, failed: 0 })
      .mockResolvedValueOnce({ sent: 0, expired: 0, failed: 1 })

    const report = await runTick(NOW)

    expect(report.deliveries).toEqual({ sent: 0, expired: 1, failed: 1 })
  })

  it('does nothing when nothing is due', async () => {
    mocks.plan.mockReset()
    mocks.plan.mockReturnValue([])
    mocks.subscriptions.mockResolvedValue([])
    mocks.logged.mockResolvedValue(new Set())

    await expect(runTick(NOW)).resolves.toEqual({
      due: 0,
      alreadySent: 0,
      sent: 0,
      deliveries: { sent: 0, expired: 0, failed: 0 },
    })
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
