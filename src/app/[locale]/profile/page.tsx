import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { redirectToSignIn } from '@/features/auth'
import {
  forgetPushSubscriptionAction,
  getPushPublicKey,
  NotificationsSetting,
  savePushSubscriptionAction,
  sendTestPushAction,
} from '@/features/notifications'
import { getMyProfile, ProfileView } from '@/features/profile'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from '../app-nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('profileTitle') }
}

// The signed-in member's own account: rendered per request.
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const result = await getMyProfile()
  if (result.kind === 'signed-out') return redirectToSignIn()
  // The preview has no member to register a device for.
  const publicKey = result.isPreview ? null : getPushPublicKey()

  return (
    <>
      <PageMain>
        <ProfileView
          result={result}
          notifications={
            <NotificationsSetting
              publicKey={publicKey}
              save={savePushSubscriptionAction}
              forget={forgetPushSubscriptionAction}
              sendTest={sendTestPushAction}
            />
          }
        />
      </PageMain>
      <AppNav />
    </>
  )
}
