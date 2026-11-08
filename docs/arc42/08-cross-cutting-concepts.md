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

- **Direction "Scoreboard"**, chosen by the club on 2026-11-08 from three explored directions (Scoreboard, Team sheet, Clubhouse) and refined into one combined screen. Night navy like a ground scoreboard, the club kit's gold for matches and a light blue for practices, so the two are never confused. Condensed display type (Barlow Condensed) for dates and headings, Inter for text. Tokens in `src/app/globals.css` (`--color-accent-match`, `--color-accent-practice`, …); no pure white anywhere.
- **A player's week, top to bottom:** the week strip (today highlighted, practice and match days marked); a banner with the number of answers needed; the match card (heading with competition and format, answer deadline, team-sheet body with the big date, Going / Not going); the practice card (the same, in practice blue); the last 4 practices as attended / missed / upcoming; the other team's match and practice below, smaller.
- **Building blocks:** shadcn/ui-style primitives with `cva` variants; `Button` in `shared/ui` (primary in match gold, outline). Motion for every interactive element (press feedback on every button), turned into instant changes under reduced motion by `MotionProvider`.
- **i18n:** next-intl in English (default, no prefix) and German (`/de`); the locale comes from the root `[locale]` segment via `next/root-params`.
- **Accessibility:** WCAG 2.2 AA; axe runs in the Playwright tests on iPhone and Android profiles; touch targets at least 44 px (answer buttons 52 px).
- **Installability:** `app/manifest.ts` (standalone, portrait, navy theme), icons in `public/icons` including a maskable one and an Apple touch icon.

## 8.6 Error handling

Typed results from server actions (`ok`, `invalid`, `unauthorized`, `closed`, `error`); every screen covers loading, empty, error, success and offline states; failures are logged on the server, never swallowed.
