import { describe, expect, it } from 'vitest'

import { describeDevice, deviceSubscriptionSchema } from './subscription'

const UA = {
  iPhone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iPad: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1',
  pixel:
    'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 Edg/131.0',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 OPR/115.0',
  firefoxMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.1; rv:132.0) Gecko/20100101 Firefox/132.0',
  linux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
}

describe('describeDevice', () => {
  it('names the system and the browser', () => {
    expect(describeDevice(UA.iPhone)).toBe('iPhone · Safari')
    expect(describeDevice(UA.iPad)).toBe('iPad · Chrome')
    expect(describeDevice(UA.pixel)).toBe('Android · Chrome')
    expect(describeDevice(UA.samsung)).toBe('Android · Samsung Internet')
    expect(describeDevice(UA.edge)).toBe('Windows · Edge')
    expect(describeDevice(UA.opera)).toBe('Windows · Opera')
    expect(describeDevice(UA.firefoxMac)).toBe('Mac · Firefox')
    expect(describeDevice(UA.linux)).toBe('Linux · Chrome')
  })

  it('says so when it recognises neither', () => {
    expect(describeDevice('curl/8.0')).toBe('Unknown device')
  })
})

describe('deviceSubscriptionSchema', () => {
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc:APA91b',
    keys: {
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  }

  it('accepts a browser subscription', () => {
    expect(deviceSubscriptionSchema.parse(subscription)).toEqual(subscription)
  })

  it('refuses an endpoint that is not https, and keys that are not base64url', () => {
    expect(
      deviceSubscriptionSchema.safeParse({ ...subscription, endpoint: 'http://push.example' })
        .success,
    ).toBe(false)
    expect(
      deviceSubscriptionSchema.safeParse({ ...subscription, keys: { p256dh: 'a b', auth: 'x' } })
        .success,
    ).toBe(false)
  })
})
