/**
 * Fires one scheduled tick by hand, signed like the GitHub Actions workflow (ADR-0004):
 * `pnpm jobs:tick`. Reads JOBS_SECRET from the environment (.env.local) and calls APP_URL,
 * by default the local app.
 */
import { createHmac } from 'node:crypto'

const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
const secret = process.env.JOBS_SECRET

if (!secret) {
  process.stderr.write('JOBS_SECRET is not set (add it to .env.local).\n')
  process.exit(1)
}

const timestamp = String(Math.floor(Date.now() / 1000))
const signature = createHmac('sha256', secret).update(timestamp).digest('hex')
const response = await fetch(`${appUrl}/api/jobs/tick`, {
  method: 'POST',
  headers: { 'x-jobs-timestamp': timestamp, 'x-jobs-signature': signature },
})

process.stdout.write(`${String(response.status)} ${await response.text()}\n`)
process.exit(response.ok ? 0 : 1)
