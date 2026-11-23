import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

import { renderWithIntl } from '@/shared/testing/render-with-intl'

import { NotificationsSetting } from './notifications-setting'

type Device = {
  isSupported: boolean
  needsInstall: boolean
  subscription: { endpoint: string; toJSON: () => object; unsubscribe: Mock } | null
  subscribe: Mock
}

const device = vi.hoisted<Device>(() => ({
  isSupported: true,
  needsInstall: false,
  subscription: null,
  subscribe: vi.fn(),
}))

vi.mock('@/shared/lib/push-device', () => ({
  isPushSupported: () => device.isSupported,
  needsHomeScreenInstall: () => device.needsInstall,
  getDeviceSubscription: () => Promise.resolve(device.subscription),
  getServiceWorker: () => Promise.resolve({ pushManager: { subscribe: device.subscribe } }),
  toApplicationServerKey: (key: string) => `bytes(${key})`,
  unsubscribeDevice: () => Promise.resolve(device.subscription?.endpoint ?? null),
}))

const ENDPOINT = 'https://push.example/abc'
function browserSubscription() {
  return {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'BNc', auth: 'tBH' } }),
    unsubscribe: vi.fn(() => Promise.resolve(true)),
  }
}

function stubPermission(permission: NotificationPermission, answer = permission) {
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn(() => Promise.resolve(answer)),
  })
}

const save = vi.fn()
const forget = vi.fn()
const sendTest = vi.fn()

function render(publicKey: string | null = 'public-key') {
  renderWithIntl(
    <NotificationsSetting publicKey={publicKey} save={save} forget={forget} sendTest={sendTest} />,
  )
}

const control = () => screen.getByRole('switch', { name: 'Notifications on this device' })

beforeEach(() => {
  device.isSupported = true
  device.needsInstall = false
  device.subscription = null
  device.subscribe.mockReset()
  device.subscribe.mockImplementation(() => Promise.resolve(browserSubscription()))
  stubPermission('default', 'granted')
  save.mockReset()
  save.mockResolvedValue({ status: 'saved' })
  forget.mockReset()
  forget.mockResolvedValue({ status: 'forgotten' })
  sendTest.mockReset()
  sendTest.mockResolvedValue({ status: 'sent' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('NotificationsSetting', () => {
  it('turns notifications on: asks permission, subscribes and registers the device', async () => {
    render()
    await waitFor(() => {
      expect(control()).toBeEnabled()
    })
    expect(control()).not.toBeChecked()

    await userEvent.click(control())

    await waitFor(() => {
      expect(control()).toBeChecked()
    })
    expect(device.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: 'bytes(public-key)',
    })
    expect(save).toHaveBeenCalledWith({
      subscription: { endpoint: ENDPOINT, keys: { p256dh: 'BNc', auth: 'tBH' } },
      userAgent: navigator.userAgent,
    })
    expect(screen.getByRole('button', { name: 'Send a test notification' })).toBeInTheDocument()
  })

  it('shows them on for a subscribed device, and registers it again for whoever is signed in', async () => {
    device.subscription = browserSubscription()
    stubPermission('granted')
    render()

    await waitFor(() => {
      expect(control()).toBeChecked()
    })
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('turns them off: ends the subscription and forgets the device', async () => {
    device.subscription = browserSubscription()
    stubPermission('granted')
    render()
    await waitFor(() => {
      expect(control()).toBeChecked()
    })

    await userEvent.click(control())

    await waitFor(() => {
      expect(control()).not.toBeChecked()
    })
    expect(forget).toHaveBeenCalledWith(ENDPOINT)
  })

  it('stays off when the member dismisses or refuses the permission prompt', async () => {
    stubPermission('default', 'default')
    render()
    await waitFor(() => {
      expect(control()).toBeEnabled()
    })
    await userEvent.click(control())
    expect(await screen.findByText(/Allow notifications when your browser asks/)).toBeVisible()
    expect(control()).not.toBeChecked()

    stubPermission('default', 'denied')
    await userEvent.click(control())
    expect(await screen.findByText(/Notifications are blocked for this app/)).toBeVisible()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('takes the subscription back when the device cannot be registered', async () => {
    const subscription = browserSubscription()
    device.subscribe.mockResolvedValueOnce(subscription)
    save.mockResolvedValueOnce({ status: 'error' })
    render()
    await waitFor(() => {
      expect(control()).toBeEnabled()
    })

    await userEvent.click(control())

    expect(await screen.findByText(/couldn't be turned on/)).toBeVisible()
    expect(subscription.unsubscribe).toHaveBeenCalled()
    expect(control()).not.toBeChecked()
  })

  it('says so when subscribing fails in the browser', async () => {
    device.subscribe.mockRejectedValueOnce(new Error('push service error'))
    render()
    await waitFor(() => {
      expect(control()).toBeEnabled()
    })

    await userEvent.click(control())

    expect(await screen.findByText(/couldn't be turned on/)).toBeVisible()
  })

  it('sends a test and says how it went', async () => {
    device.subscription = browserSubscription()
    stubPermission('granted')
    render()
    const test = await screen.findByRole('button', { name: 'Send a test notification' })

    await userEvent.click(test)
    expect(await screen.findByText('Test sent. It should arrive in a moment.')).toBeVisible()

    sendTest.mockResolvedValueOnce({ status: 'no-device' })
    await userEvent.click(test)
    expect(await screen.findByText(/No device is registered yet/)).toBeVisible()

    sendTest.mockRejectedValueOnce(new Error('network'))
    await userEvent.click(test)
    expect(await screen.findByText("The test couldn't be sent. Please try again.")).toBeVisible()
  })

  it.each([
    [
      'an iPhone in a browser tab',
      () => {
        device.needsInstall = true
      },
      /add the app to your Home Screen/,
    ],
    [
      'a browser without push',
      () => {
        device.isSupported = false
      },
      /can't show notifications/,
    ],
    [
      'notifications blocked earlier',
      () => {
        stubPermission('denied')
      },
      /blocked for this app/,
    ],
  ])('explains instead of offering a switch on %s', async (_, arrange, text) => {
    arrange()
    render()

    expect(await screen.findByText(text)).toBeVisible()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('says notifications are not available on a server without keys, or in the preview', () => {
    render(null)

    expect(screen.getByText("Notifications aren't available yet.")).toBeVisible()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('turns off a device whose subscription has already gone without forgetting anything', async () => {
    device.subscription = browserSubscription()
    stubPermission('granted')
    render()
    await waitFor(() => {
      expect(control()).toBeChecked()
    })
    device.subscription = null

    await userEvent.click(control())

    await waitFor(() => {
      expect(control()).not.toBeChecked()
    })
    expect(forget).not.toHaveBeenCalled()
  })

  it('ignores a check that finishes after the member has left the page', async () => {
    renderWithIntl(
      <NotificationsSetting publicKey="key" save={save} forget={forget} sendTest={sendTest} />,
    ).unmount()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(save).not.toHaveBeenCalled()
  })

  it('treats a device it cannot check as off', async () => {
    device.subscription = browserSubscription()
    stubPermission('granted')
    save.mockRejectedValueOnce(new Error('down'))
    render()

    await waitFor(() => {
      expect(control()).toBeEnabled()
    })
    expect(control()).not.toBeChecked()
  })
})
