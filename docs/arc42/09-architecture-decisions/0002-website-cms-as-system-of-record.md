# 0002. The website's CMS is the system of record; this app is a backend-for-frontend

- Status: accepted
- Date: 2026-11-08

## Context

Fixtures, teams and players are already maintained in the club website's Payload CMS (Neon Postgres), together with the editors' accounts. The app needs those plus new data: availability answers, practices and attendance, squads and approvals, Spielerpasses and push subscriptions. It must stay at €0 and be run by one developer.

## Decision Drivers

- One source of truth: a fixture entered once appears on the website and in the app.
- €0: no second database or backend service.
- Security: personal data (absence reasons, Spielerpasses) behind role checks; no CMS tokens in the browser.
- Clear ownership and independent deployability of the two projects.

## Considered Options

1. **Extend the website's Payload** with the app's collections; the app is a separate Next.js app whose server calls Payload's REST API (backend-for-frontend).
2. A separate backend for the app (e.g. Supabase free tier), syncing fixtures and players from the website.
3. Build the app inside the website repo (one Next.js app, one deployment).
4. The browser calls Payload's REST API directly.

## Decision

Option 1.

- New collections in the website's Payload: `practice-sessions`, `availability-responses`, `attendance`, `squads`, `spielerpasses`, `push-subscriptions`, `notification-log`. `users` gains `role` (player, captain, admin), `player` and `captainOf`; `players` gains `isEcc1Eligible`. Access control in Payload enforces who may read and write what.
- The app's server holds the member's Payload token in an HTTP-only, same-site cookie on the app's own domain and calls Payload with `Authorization: JWT …`. The browser never talks to Payload.
- Server actions check roles and club rules before writing; Payload checks access again (defence in depth).
- Option 2 creates two sources of truth and a sync to maintain. Option 3 mixes a public, SEO-driven site with a members' tool in one deployment and one repo; separate repos keep both reviewable and deployable on their own. Option 4 would put CMS tokens in the browser and need CORS and cross-site cookies (`*.vercel.app` domains are different sites).

## Consequences

- Good: fixtures and players are never copied; the admin keeps using one CMS.
- Good: the browser holds only an app session; secrets and rules stay on servers.
- Bad: every request is a network hop from the app to the website's API, and Neon may cold-start. Mitigation: request-level caching of fixtures, batching per screen, skeleton states.
- Bad: two repos must change together for a new collection. Mitigation: each slice adds its collection in the website repo first (with a migration and an ADR there), then the app uses it; the app validates every response with Zod, so a mismatch fails fast.
- Neutral: the website's `users` collection becomes the members' accounts too; the website's editor rights are tied to the `admin` role.
