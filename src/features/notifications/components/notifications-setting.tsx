'use client'

import { BellOff, BellRing } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useId, useState } from 'react'

import {
  getDeviceSubscription,
  getServiceWorker,
  isPushSupported,
  needsHomeScreenInstall,
  toApplicationServerKey,
  unsubscribeDevice,
} from '@/shared/lib/push-device'
import { Button } from '@/shared/ui/button'
import { Switch } from '@/shared/ui/switch'

import type {
  ForgetPushSubscription,
  SavePushSubscription,
  SaveSubscriptionInput,
  SendTestPush,
} from '../types'

export type NotificationsSettingProps = {
  /** The server's VAPID public key; `null` when this server sends no notifications. */
  publicKey: string | null
  save: SavePushSubscription
  forget: ForgetPushSubscription
  sendTest: SendTestPush
}

/**
 * What this device can do: still checking; push impossible here; an iPhone that must add the app
 * to its Home Screen first; blocked in the device's settings; or off and on.
 */
type DeviceState = 'checking' | 'unsupported' | 'install' | 'denied' | 'off' | 'on'
type Notice = 'failed' | 'blocked' | 'sent' | 'no-device' | 'test-failed'

const TOGGLEABLE: ReadonlySet<DeviceState> = new Set(['checking', 'off', 'on'])

/** The browser's subscription as plain JSON, as the server action expects it. */
function toInput(subscription: PushSubscription): SaveSubscriptionInput {
  return { subscription: subscription.toJSON(), userAgent: navigator.userAgent }
}

async function detect(save: SavePushSubscription): Promise<DeviceState> {
  if (needsHomeScreenInstall()) return 'install'
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const subscription = await getDeviceSubscription()
  if (!subscription) return 'off'
  // Re-registers the device on every visit: it follows whoever is signed in on it now.
  await save(toInput(subscription))
  return 'on'
}

type CardProps = {
  isOn: boolean
  labelId: string
  helpId: string
  help: string
  control?: ReactNode
  children?: ReactNode
}

function Card({ isOn, labelId, helpId, help, control, children }: CardProps) {
  const t = useTranslations('notifications')
  const Icon = isOn ? BellRing : BellOff
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4">
      <div className="flex items-center gap-3">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-accent-practice" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p id={labelId} className="font-semibold">
            {t('label')}
          </p>
          <p id={helpId} className="text-sm text-text-muted">
            {help}
          </p>
        </div>
        {control}
      </div>
      {children}
    </div>
  )
}

function DeviceNotifications({
  publicKey,
  save,
  forget,
  sendTest,
}: NotificationsSettingProps & { publicKey: string }) {
  const t = useTranslations('notifications')
  const id = useId()
  const [state, setState] = useState<DeviceState>('checking')
  const [isBusy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    let isCurrent = true
    void detect(save)
      .catch((): DeviceState => 'off')
      .then((detected) => {
        if (isCurrent) setState(detected)
      })
    return () => {
      isCurrent = false
    }
  }, [save])

  async function turnOn() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'denied' : 'off')
      if (permission !== 'denied') setNotice('blocked')
      return
    }
    const registration = await getServiceWorker()
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toApplicationServerKey(publicKey),
    })
    const { status } = await save(toInput(subscription))
    if (status !== 'saved') {
      await subscription.unsubscribe()
      setNotice('failed')
      return
    }
    setState('on')
  }

  async function turnOff() {
    const endpoint = await unsubscribeDevice()
    if (endpoint) await forget(endpoint)
    setState('off')
  }

  async function change(isOn: boolean) {
    setBusy(true)
    setNotice(null)
    try {
      await (isOn ? turnOn() : turnOff())
    } catch {
      setNotice('failed')
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    setBusy(true)
    setNotice(null)
    const { status } = await sendTest().catch(() => ({ status: 'error' as const }))
    setNotice(status === 'sent' ? 'sent' : status === 'no-device' ? 'no-device' : 'test-failed')
    setBusy(false)
  }

  const labelId = `${id}-label`
  const helpId = `${id}-help`

  return (
    <Card
      isOn={state === 'on'}
      labelId={labelId}
      helpId={helpId}
      help={t(`state.${state}`)}
      control={
        TOGGLEABLE.has(state) && (
          <Switch
            isOn={state === 'on'}
            onChange={(isOn) => {
              void change(isOn)
            }}
            labelledBy={labelId}
            describedBy={helpId}
            isDisabled={state === 'checking'}
            isBusy={isBusy}
          />
        )
      }
    >
      {state === 'on' && (
        <Button variant="outline" disabled={isBusy} onClick={() => void test()}>
          {t('sendTest')}
        </Button>
      )}
      <p role="status" className="text-sm empty:hidden">
        {notice ? t(`notice.${notice}`) : null}
      </p>
    </Card>
  )
}

/** Notifications on this device: turn them on or off, and send a test (ADR-0003). */
export function NotificationsSetting({ publicKey, ...actions }: NotificationsSettingProps) {
  const t = useTranslations('notifications')
  const id = useId()
  if (!publicKey) {
    return (
      <Card
        isOn={false}
        labelId={`${id}-label`}
        helpId={`${id}-help`}
        help={t('state.unavailable')}
      />
    )
  }
  return <DeviceNotifications publicKey={publicKey} {...actions} />
}
