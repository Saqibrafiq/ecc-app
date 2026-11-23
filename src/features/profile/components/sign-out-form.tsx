'use client'

import { LogOut } from 'lucide-react'

import { unsubscribeDevice } from '@/shared/lib/push-device'
import { Button } from '@/shared/ui/button'

export type SignOutFormProps = {
  signOut: () => Promise<void>
  label: string
}

/**
 * Signs the member out, ending this device's push subscription first: on a shared phone, the next
 * member never gets the previous one's notifications. The push service then reports the old
 * subscription gone, and the next send removes it.
 */
export function SignOutForm({ signOut, label }: SignOutFormProps) {
  return (
    <form
      action={async () => {
        // Signing out never waits on, or fails because of, the push service.
        await unsubscribeDevice().catch(() => null)
        await signOut()
      }}
    >
      <Button type="submit" variant="outline" className="w-full">
        <LogOut aria-hidden="true" className="size-5" />
        {label}
      </Button>
    </form>
  )
}
