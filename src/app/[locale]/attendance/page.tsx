import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { AttendanceView, getMyLedger, requestCorrectionAction } from '@/features/attendance'
import { redirectToSignIn } from '@/features/auth'
import { PageMain } from '@/shared/ui/page-main'

import { AppNav } from '../app-nav'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('attendanceTitle') }
}

// The member's own records as they stand now: rendered per request.
export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const result = await getMyLedger()
  if (result.kind === 'signed-out') return redirectToSignIn()

  return (
    <>
      <PageMain>
        <AttendanceView
          result={result}
          requestCorrection={
            result.kind === 'ledger' && !result.isPreview ? requestCorrectionAction : undefined
          }
        />
      </PageMain>
      <AppNav />
    </>
  )
}
