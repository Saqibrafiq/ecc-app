# 0004. Hourly, idempotent scheduled jobs triggered by GitHub Actions

- Status: accepted
- Date: 2026-11-08

## Context

The club's week has fixed moments in Europe/Berlin time: Monday morning (create practices, ask everyone), practice day 21:00 (captains mark attendance), end of Tuesday or an extended deadline (captains select), and after approvals (selection notices). Vercel Hobby runs its own cron jobs at most once a day, with imprecise timing. Times shift between CET and CEST twice a year.

## Decision Drivers

- €0.
- Correct local times across daylight-saving changes.
- A retried or doubled trigger must never double-send; a missed trigger must catch up.
- Deadlines can move (admin extensions), so schedules cannot be fixed in a cron file.

## Considered Options

1. **GitHub Actions `schedule` every hour** calls one signed job endpoint; the app decides what is due.
2. One cron entry per moment (e.g. `0 19 * * 3` for 21:00 CEST), fixed in UTC.
3. Vercel Cron.
4. An external free cron service.

## Decision

Option 1.

- A workflow runs hourly (`cron: '7 * * * *'`, off the hour to avoid GitHub's peak delays) and POSTs to `/api/jobs/tick` with an HMAC signature over the timestamp (secret in GitHub and Vercel).
- The endpoint asks the domain rules what is due _now_ in Europe/Berlin: create the week's practices, Monday reminders, 21:00 practice checks, deadline reminders, attendance warnings. Each task has a deterministic key; the notification log makes sending idempotent.
- Because each tick looks for everything that is due and not yet done, a delayed or skipped hour catches up on the next tick. Deadline extensions take effect automatically.
- Option 2 breaks at every DST change and cannot follow extended deadlines. Option 3 is daily only on Hobby. Option 4 adds an external dependency holding a secret.

## Consequences

- Good: €0 (public repo minutes are free), DST-safe, self-healing, deadlines follow admin changes.
- Bad: up to about an hour's delay (GitHub schedules can lag); "21:00" means "in the 21:00 hour". Acceptable for the club; documented in section 10.
- Bad: GitHub disables scheduled workflows in repos without activity for 60 days. Mitigation: the season keeps the repo active; a monthly keep-alive commit off-season if needed (risk R-3).
- Neutral: admins can trigger a tick by hand (`workflow_dispatch`).
