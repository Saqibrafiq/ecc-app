# 0003. Web Push with VAPID, sent by the app server

- Status: accepted
- Date: 2026-11-08

## Context

Members must be notified on Monday (the week's events), on practice day at 21:00 (captains), at the selection deadline (captains), after approval (selected or not) and when they miss practices. The app is a PWA (ADR-0001). It must stay at €0.

## Decision Drivers

- €0 at the club's volume (about 40 members, a few notifications per member per week).
- Works on Android and on iOS 16.4+ (installed PWA).
- No third-party service that receives members' personal data.
- Reliable, exactly-once delivery from the club's point of view.

## Considered Options

1. **Standard Web Push (VAPID)** sent from the app server with the `web-push` library.
2. Firebase Cloud Messaging for web.
3. A notification SaaS (e.g. OneSignal free tier).
4. Email only.

## Decision

Option 1.

- Each device registers a push subscription (endpoint and keys) after the member allows notifications; it is stored in Payload (`push-subscriptions`), linked to the user.
- The server signs messages with the VAPID key pair (secrets in Vercel env) and sends encrypted payloads to the browser's push service.
- Payloads carry only what the recipient may see: the event and the action ("Answer for Saturday's match"), never absence reasons or Spielerpass data.
- Expired subscriptions (HTTP 404/410 from the push service) are deleted.
- Every send is recorded in `notification-log` with a deterministic key (kind + subject + recipient), so a repeated job sends nothing twice (ADR-0004).

## Consequences

- Good: no vendor, no cost, no extra processor in the privacy policy beyond the browsers' push services.
- Good: the same code reaches Android and iOS.
- Bad: delivery is best effort and depends on the device (battery saving, focus modes). Mitigation: the app shows the same tasks on its home screen ("2 answers missing"), so a lost notification never blocks anyone.
- Bad: members who never allow notifications are not reached. Mitigation: captains and admins see who has push off.
