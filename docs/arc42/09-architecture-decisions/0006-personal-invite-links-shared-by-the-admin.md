# 0006. First sign-in through personal invite links shared by the admin

- Status: accepted
- Date: 2026-11-08

## Context

About 44 members need an account linked to their player profile on the website. The club communicates through WhatsApp; members' email addresses are not all known. The project runs at €0 and should not depend on an email provider. The president decided on 2026-11-08 (Q-6).

## Decision Drivers

- Easy first sign-in for members who are not technical.
- No email service: no extra provider, no cost, no deliverability problems.
- Each account belongs to exactly one player; nobody can claim someone else's profile.
- Recovery without the developer.

## Considered Options

1. **Personal invite link** created by the admin per member and sent on WhatsApp; the member sets a password.
2. Email sign-in links (passwordless), using a free email service.
3. Invite email plus password, with "forgot password" by email.
4. Self sign-up with a club code, linked to a player by the admin.

## Decision

Option 1.

- The admin opens a member in the app and taps **Create invite link**. The link carries a random one-time token (at least 128 bits). Only a hash of the token is stored, with the player it belongs to and an expiry of 7 days.
- The admin shares the link (WhatsApp share sheet on the phone). The member opens it, sees their name, chooses a password and is signed in. The token is then used up.
- Forgotten password: the admin creates a new link, which replaces any older one. The same flow, so there is one mechanism to secure and test.
- Accounts live in the website's `users` collection (ADR-0002), with the role set by the admin and the link to the player record.
- Option 2 and 3 need an email provider and members' addresses. Option 4 lets anyone with the code start an account and leaves the admin to sort out who is who.

## Consequences

- Good: €0, no email provider, no addresses needed; matches how the club already talks.
- Good: identity is fixed by the admin when the link is created, so accounts cannot be claimed by the wrong person.
- Bad: an invite link forwarded to someone else could be used by them within its 7 days. Mitigation: single use, short expiry, the member's name shown before setting a password, and the admin sees when each link was used.
- Bad: password recovery needs the admin. Acceptable for a club of this size; sessions last long, so it is rare.
- Neutral: email sign-in can be added later without changing accounts.
