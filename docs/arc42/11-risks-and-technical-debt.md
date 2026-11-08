# 11. Risks & Technical Debt

## 11.1 Risks

| ID  | Risk                                                                          | Probability | Impact | Mitigation                                                                                                     |
| --- | ----------------------------------------------------------------------------- | ----------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| R-1 | iPhone members never add the app to the Home Screen and miss notifications    | High        | High   | First-run install guide; "push off" shown to captains and admins; tasks also visible on the app's home screen. |
| R-2 | Free-tier limits change (Vercel, Neon, GitHub Actions)                        | Medium      | High   | Small volumes; monthly usage check; architecture portable to other free hosts.                                 |
| R-3 | GitHub disables the hourly schedule after 60 days without repository activity | Medium      | High   | Active during the season; keep-alive off-season; a failing tick alerts the admin.                              |
| R-4 | Spielerpass images leak (personal data)                                       | Low         | High   | Private storage, access-checked route, no caching, audit log; ADR before the Spielerpass slice.                |
| R-5 | Changing the website's backend breaks the website                             | Low         | High   | Additive migrations only; the website's CI and E2E tests run on every backend change.                          |
| R-6 | Members find the rules unfair because data was entered late or wrong          | Medium      | Medium | Captains can correct attendance until the next practice; every change is logged with who and when.             |

## 11.2 Questions decided with the club

Decided by the club president on 2026-11-08.

| ID  | Question                                                     | Decision                                                                                                                                                        |
| --- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1 | Is there a practice in a week without a match for that team? | No automatic practice. If anyone wants one, the admin creates it by hand (UC-16).                                                                               |
| Q-2 | Do cancelled practices count in the "last 4"?                | No. Only practices that took place count (R-2).                                                                                                                 |
| Q-3 | How big is a squad?                                          | A team's squad (roster) has been 15 players and may grow to 17–18; the club has 44 registered members. No fixed size; the admin assigns players to teams (R-9). |
| Q-4 | When are members reminded?                                   | First on Monday, then **every day until the member has answered**, for practices and matches alike (R-10).                                                      |
| Q-5 | How long are Spielerpass images kept?                        | Out of the app's scope: the admin uploads, replaces and deletes Spielerpasses by hand, as the club decides.                                                     |
| Q-6 | How do the 44 members get their first login?                 | A personal, one-time invite link per member, created by the admin and sent on WhatsApp; the member sets a password. Forgotten passwords: a new link (ADR-0006). |

## 11.3 Open questions

| ID  | Question                                           | Status                                                                                                 |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Q-7 | How many players does a captain pick for a match?  | Assumed: the playing XI plus optional reserves, at least 11; no upper limit enforced. To be confirmed. |
| Q-8 | At what time of day do the daily reminders go out? | Assumed: Monday 09:00, then daily at 18:00 until answered or the event's deadline passes.              |

## 11.4 Technical debt

None yet.
