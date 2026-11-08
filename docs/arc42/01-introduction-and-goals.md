# 1. Introduction & Goals

## 1.1 Requirements overview

Erlangen Cricket Club runs two league teams, **ECC I** and **ECC II**. Today the club creates a Facebook event for every match and practice; members mark themselves as going or not, and captains and the board count heads by hand. Reasons for absence, practice attendance and squad decisions are not recorded anywhere.

The ECC App replaces this with one app on every member's phone. Fixtures come from the club website; practices are created automatically; members answer from a notification; captains record attendance and pick the squad; the board approves it.

### Use cases

| ID    | Use case                   | Actor   | Summary                                                                                                                                                                                                   |
| ----- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UC-1  | See my week                | Player  | The coming week's match and practice of my team first ("recommended"), the other team's events below.                                                                                                     |
| UC-2  | Answer availability        | Player  | Mark a match or practice as **Going** or **Not going**. Not going requires a reason. The answer can be changed until the deadline.                                                                        |
| UC-3  | Help the other team        | Player  | Mark myself as going for the other team's match when they are short or the board or a captain asks. My own team keeps priority.                                                                           |
| UC-4  | Reminders                  | System  | On Monday every member is notified about the week's practice and match, and reminded **every day until they have answered** (R-10).                                                                       |
| UC-5  | Create practices           | System  | Every week with a match, one practice per team: a team with a **Saturday** match practises on **Wednesday**, a team with a **Sunday** match on **Thursday**. No match, no automatic practice.             |
| UC-6  | Record practice attendance | Captain | On practice day at 21:00 the captain is notified with the list of players who said going, and marks each as **attended** or **absent**. Players who did not answer or said no but came are added by hand. |
| UC-7  | Track my attendance        | Player  | See how many of my last 4 practices I attended, and what I still need: "You missed 1 practice; attend 2 of the next 3".                                                                                   |
| UC-8  | Attendance warnings        | System  | Each week, a player who has missed practices is notified of what they still need to stay eligible.                                                                                                        |
| UC-9  | Select the squad           | Captain | After availability closes (end of Tuesday by default) the captain is notified and picks the squad from the players who said going. Eligible and ineligible players are shown separately, with the reason. |
| UC-10 | Extend the deadline        | Admin   | Move a match's availability deadline from Tuesday to Wednesday or Thursday.                                                                                                                               |
| UC-11 | Approve the squad          | Admin   | Approve the captain's selection or send it back with a note.                                                                                                                                              |
| UC-12 | Selection notices          | System  | After approval, every player who answered is told whether they were selected.                                                                                                                             |
| UC-13 | Show Spielerpasses         | Captain | For an approved squad, the captain sees every selected player's Spielerpass, to show the umpire before the match.                                                                                         |
| UC-14 | Make exceptions            | Admin   | Make an ineligible player selectable for one match (e.g. the team cannot field 11).                                                                                                                       |
| UC-15 | Manage members             | Admin   | Assign each member a team and a role, flag who may play for ECC I, and upload, replace or delete each player's Spielerpass.                                                                               |
| UC-16 | Add a practice             | Admin   | Create a practice by hand, e.g. in a week without a match when players want to train.                                                                                                                     |
| UC-17 | Invite a member            | Admin   | Create a personal one-time invite link for a member and send it on WhatsApp; the member opens it and sets a password (ADR-0006). The same for a forgotten password.                                       |

### Club rules

| ID   | Rule                                                                                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-1  | **Practice day.** A team with a Saturday match practises on the Wednesday before; with a Sunday match, on the Thursday before.                                             |
| R-2  | **Attendance rule.** A player must have attended at least **2 of their team's last 4 practices** to be selectable. Cancelled practices do not count.                       |
| R-3  | **Countdown.** After each practice the player is told what they still need within the current window (e.g. "attend 2 of the next 3").                                      |
| R-4  | **ECC I eligibility.** Only players the admin has flagged as ECC I eligible can be selected for ECC I (new members typically are not, e.g. those who joined in 2027).      |
| R-5  | **Deadline.** Availability for a match closes at the end of Tuesday (Europe/Berlin) unless the admin extends it to Wednesday or Thursday.                                  |
| R-6  | **Reason required.** "Not going" always needs a reason.                                                                                                                    |
| R-7  | **Priority.** A player's own team has priority; answering for the other team is allowed but shown to captains as such.                                                     |
| R-8  | **Exceptions.** Only an admin can make an ineligible player selectable, per match.                                                                                         |
| R-9  | **Team squads.** Each player belongs to one team's squad (roster), assigned by the admin. Squads have been about 15 players and may grow to 17–18; there is no fixed size. |
| R-10 | **Daily reminders.** A member who has not answered for a practice or match is reminded every day, starting Monday, until they answer or the event closes.                  |

### Roles

| Role        | Can                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Player**  | See events, answer availability, see their own attendance.                                                                           |
| **Captain** | Everything a player can, plus: mark practice attendance and select the squad for their team; see the approved squad's Spielerpasses. |
| **Admin**   | Everything: approve squads, extend deadlines, make exceptions, manage members, roles, teams and Spielerpasses.                       |

## 1.2 Quality goals

| Priority | Quality goal           | Motivation                                                                                                                                       |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | **Correctness**        | The rules decide who plays. A wrong attendance count or a missed deadline is unfair to a player and destroys trust in the app.                   |
| 2        | **Usability**          | Answering must take one tap from a notification; captains mark attendance standing at the ground. If it is slower than Facebook, nobody uses it. |
| 3        | **Reliability**        | Notifications arrive on time, exactly once. Scheduled jobs survive retries and daylight-saving changes.                                          |
| 4        | **Privacy & security** | Absence reasons and Spielerpass images are personal data; each role sees only what it needs (GDPR).                                              |
| 5        | **Maintainability**    | One developer, a long-lived club tool and a portfolio piece: clear module boundaries and tested rules.                                           |

Concrete scenarios are in [section 10](10-quality-requirements.md).

## 1.3 Stakeholders

| Stakeholder               | Expectations                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| Players                   | One-tap answers, clear attendance status, fair selection                                  |
| Captains                  | Know who is coming and who trained; pick an eligible squad quickly; Spielerpasses at hand |
| Board (admins)            | Overview and control: approvals, deadlines, exceptions, member data                       |
| Club (e. V.)              | €0 running cost, GDPR compliance                                                          |
| Owner / developer (Saqib) | Maintainable codebase; portfolio demonstrating senior/architect-level skills              |
| Recruiters / team leads   | Visible polish in the app and the repository within seconds                               |
