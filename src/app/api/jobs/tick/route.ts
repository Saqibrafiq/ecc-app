import { isSignedTick, runTick } from '@/features/jobs'
import { isBackendConfigured } from '@/shared/backend/client'
import { getServerEnv } from '@/shared/config/env'
import { getNow } from '@/shared/lib/clock'
import { logError } from '@/shared/lib/log'

// A tick works out what is due from the time it runs: never cached, never prerendered.
export const dynamic = 'force-dynamic'
// A week's notifications take seconds; this leaves room for a slow backend.
export const maxDuration = 60

/**
 * The scheduler's hourly tick (ADR-0004): GitHub Actions signs it with the shared secret; the app
 * then sends whatever is due. Off until the secret and the backend are configured.
 */
export async function POST(request: Request) {
  const { JOBS_SECRET } = getServerEnv()
  if (!JOBS_SECRET || !isBackendConfigured()) return new Response(null, { status: 503 })

  // The replay window is a security check: it uses the real time, never the pinned dev clock.
  if (!isSignedTick(request.headers, JOBS_SECRET, new Date())) {
    return new Response(null, { status: 401 })
  }

  try {
    return Response.json(await runTick(getNow()))
  } catch (error) {
    logError('The scheduled tick failed', error)
    return new Response(null, { status: 500 })
  }
}
