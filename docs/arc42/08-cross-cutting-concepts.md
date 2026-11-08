# 8. Cross-cutting Concepts

## 8.1 Time

- All club rules are defined in **Europe/Berlin** local time and stored as UTC instants. One module (`shared/lib/dates`) converts; nothing else touches time zones.
- Domain functions take `now` as an argument; tests pin it, including the DST weeks.

## 8.2 Security and roles

- First sign-in and recovery: one-time invite links created by the admin (random token, only its hash stored, 7-day expiry, single use), shared on WhatsApp (ADR-0006).
- Session: the member's Payload token is kept in an HTTP-only, `Secure`, same-site cookie on the app's domain; the browser never sees it.
- Roles: `player`, `captain` (of one team), `admin`. Checked in every server action and again by Payload access control.
- Job endpoint: HMAC signature over a timestamp; requests older than five minutes are rejected (replay protection).

## 8.3 Privacy

- Data minimisation: only what the club rules need. Absence reasons visible to the player, their captain and admins only.
- Spielerpasses: private storage, served through an access-checked route, visible to admins and to the captain of an approved squad the player is in. Never cached by the service worker.
- Notifications contain no personal data beyond what the recipient may see.

## 8.4 Offline and installability

- Web app manifest (name, icons, theme colours, `display: standalone`); service worker caches the app shell and the last-seen week for reading offline.
- Writes require a connection; the UI says so and keeps the user's choice until it can be sent.

## 8.5 Design system, motion, i18n, accessibility

Same approach as the website: tokens from the club crest, light and dark, no pure white; shadcn/ui primitives with `cva` variants; Motion for every interactive element, off under reduced motion; next-intl in English and German; WCAG 2.2 AA with axe in CI. Details follow with the first screens.

## 8.6 Error handling

Typed results from server actions (`ok`, `invalid`, `unauthorized`, `closed`, `error`); every screen covers loading, empty, error, success and offline states; failures are logged on the server, never swallowed.
