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
| R-7 | The DCB changes the match report sheet, so filled fields no longer fit        | Low         | Medium | Template and field positions in one place; a test checks every field lands inside its box (ADR-0007).          |

## 11.2 Questions decided with the club

Decided by the club president on 2026-11-08.

| ID   | Question                                                                  | Decision                                                                                                                                                                           |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q-1  | Is there a practice in a week without a match for that team?              | No automatic practice. If anyone wants one, the admin creates it by hand (UC-16).                                                                                                  |
| Q-2  | Do cancelled practices count in the "last 4"?                             | No. Only practices that took place count (R-2).                                                                                                                                    |
| Q-3  | How big is a squad?                                                       | A team's squad (roster) has been 15 players and may grow to 17–18; the club has 44 registered members. No fixed size; the admin assigns players to teams (R-9).                    |
| Q-4  | When are members reminded?                                                | First on Monday, then **every day until the member has answered**, for practices and matches alike (R-10).                                                                         |
| Q-5  | How long are Spielerpass images kept?                                     | Out of the app's scope: the admin uploads, replaces and deletes Spielerpasses by hand, as the club decides.                                                                        |
| Q-6  | How do the 44 members get their first login?                              | A personal, one-time invite link per member, created by the admin and sent on WhatsApp; the member sets a password. Forgotten passwords: a new link (ADR-0006).                    |
| Q-11 | How does the attendance rule work at the start of the season?             | Practice starts before the first match. The rule applies once 4 practices of the season count for a match, pre-season ones included (R-11).                                        |
| Q-13 | When are teams announced, given the practice is on Wednesday or Thursday? | By the end of Thursday, after the practice. Availability still closes on Tuesday (R-5).                                                                                            |
| Q-7  | How many players does a captain pick for a match?                         | A playing XI of 11 plus one 12th man; reserves may be added, e.g. for two games on one day. The 12th man and reserves play the team's next match automatically (R-12, R-13).       |
| Q-12 | What if a player came to practice but was not marked?                     | The captain marks everyone, themselves included; anyone not marked present counts as absent. The player sees it in the app and asks the captain or an admin to correct it (UC-18). |
| Q-8  | When do reminders go out?                                                 | Monday at 11:00, then every day at 11:00 until the member has answered (R-10).                                                                                                     |
| Q-10 | When do practice answers close?                                           | 12 hours before the practice starts (R-5).                                                                                                                                         |
| Q-15 | What goes in rows A1, A2, B1 and B2 of the DCB match report sheet?        | A1 the 12th man, A2 the first reserve; B1 and B2 (team officials) are left for the captain to fill by hand (R-17).                                                                 |
| Q-9  | Which 4 practices count when the captain selects for a match?             | The team's 4 most recent practices up to and including the one in the match's week, e.g. for Saturday 8 May: 14, 21 and 28 April and 5 May.                                        |
| Q-14 | Last match's 12th man (or reserve) answers Not going for the next match.  | He forfeits the automatic place for that match, is notified that he gave up a place the motion guaranteed him, and is selected normally from then on.                              |

### Motions and the app: decided with the club president on 2026-11-08

| Topic                         | Decision                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Squad of fifteen (2026/02)    | A guide, not a limit; the app enforces no squad size (R-9).                                                                  |
| Equal treatment (2024/02)     | "Own team first" is display order only; any member can answer for the other team; borrowing needs both captains (R-7, R-16). |
| Board and captaincy (2024/04) | Separate jobs by design: captains select, the Board approves and announces. Nothing to block in the app.                     |
| Vice-captains (2026/07)       | No separate role; an admin records attendance when the captain cannot; a stand-in captain gets the captain role.             |
| Bundesliga squad (2023/08)    | Superseded by later motions; not built.                                                                                      |

## 11.3 Open questions

| ID  | Question | Status |
| --- | -------- | ------ |

## 11.4 Technical debt

| ID   | Debt                                                                                                                                                                                                        | Plan                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| TD-1 | App icons are scaled up from the only crest file available (256 px), so the 512 px icons are soft.                                                                                                          | Replace with a high-resolution or vector crest.                                            |
| TD-2 | Players cannot read a match's squad until it is approved, so an admin's deadline extension (stored on the squad) is not shown on their cards; the server still accepts answers until the extended deadline. | Website: make `deadlineDay` of open squads readable by members, keeping the picks private. |
| TD-3 | Practices are created when a member opens the week (idempotent); the scheduled Monday job will take this over (ADR-0004).                                                                                   | Notifications slice.                                                                       |
