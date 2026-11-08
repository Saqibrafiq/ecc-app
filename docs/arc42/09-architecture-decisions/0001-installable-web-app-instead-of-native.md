# 0001. Installable web app (PWA) instead of a native app

- Status: accepted
- Date: 2026-11-08

## Context

The club wants an app on every member's phone, on iPhone and Android, with push notifications for availability, practice attendance and selection. The original request was React Native. The project must run at €0 (constraint, section 2).

A native iPhone app that receives push notifications needs the Apple Developer Program (US$99 per year) for signing, push certificates and distribution. Android needs a one-time US$25 for the Play Store, or members must sideload an APK. The club has no budget for either.

## Decision Drivers

- €0 running cost, on both platforms.
- Push notifications on iPhone and Android.
- One codebase for one developer.
- Updates reach every member immediately, without store reviews.
- Portfolio value.

## Considered Options

1. **Installable web app (PWA)** with Web Push: Next.js, web app manifest, service worker.
2. React Native (Expo) for both platforms, the club paying US$99/year + US$25.
3. React Native (Expo) on Android only (sideloaded APK), iPhone later.
4. Keep Facebook events.

## Decision

Option 1, a PWA.

- Members install it from the browser (on iPhone: Safari → Share → Add to Home Screen). It opens full-screen with its own icon.
- Web Push works on Android browsers and on iOS 16.4+ for apps added to the Home Screen. Apple's, Google's and Mozilla's push services deliver it at no cost.
- Option 2 breaks the €0 constraint. Option 3 leaves out every iPhone user, about half the squad. Option 4 is the problem being solved.

## Consequences

- Good: €0 on both platforms; one codebase, the same stack as the website; instant updates; no store review.
- Good: shares the website's design tokens, i18n and tooling.
- Bad: on iPhone each member must add the app to the Home Screen once, or they get no notifications. Mitigation: an install guide on first visit, and a "push on/off" column for captains and admins so nobody is silently missed.
- Bad: web push actions (buttons inside the notification) are not supported everywhere; a tap opens the event, where answering takes one more tap.
- Neutral: if the club later pays for Apple's programme, an Expo app can reuse the domain rules (`src/domain/club-rules`) and the backend API unchanged. This ADR would then be superseded.
