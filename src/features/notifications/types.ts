/** What a notification says and where a tap leads; only what its recipient may see (ADR-0003). */
export type PushMessage = {
  title: string
  body: string
  /** A path inside the app, e.g. `/team`. */
  url: string
  /** A newer notification with the same tag replaces the older one on the device. */
  tag?: string
}

/** A device's Web Push subscription, as the browser hands it over. */
export type DeviceSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** The browser's subscription as it serialises it; the server checks it before storing. */
export type SaveSubscriptionInput = { subscription: PushSubscriptionJSON; userAgent: string }
export type SaveSubscriptionOutcome = 'saved' | 'invalid' | 'unavailable' | 'unauthorized' | 'error'
/** Registers this device for the signed-in member; the preview has none. */
export type SavePushSubscription = (
  input: SaveSubscriptionInput,
) => Promise<{ status: SaveSubscriptionOutcome }>

export type ForgetSubscriptionOutcome = 'forgotten' | 'invalid' | 'unauthorized' | 'error'
/** Removes this device from the signed-in member's devices. */
export type ForgetPushSubscription = (
  endpoint: string,
) => Promise<{ status: ForgetSubscriptionOutcome }>

export type TestPushOutcome = 'sent' | 'no-device' | 'unavailable' | 'unauthorized' | 'error'
/** Sends a test notification to every device of the signed-in member. */
export type SendTestPush = () => Promise<{ status: TestPushOutcome }>

/** What a send did: delivered to the push service, removed as expired, or failed otherwise. */
export type SendReport = { sent: number; expired: number; failed: number }
