# 5. Building Block View

## 5.1 Level 1: containers

```mermaid
C4Container
  title ECC App: containers

  Person(member, "Member", "Player, captain or admin, on a phone")

  System_Boundary(appBoundary, "ECC App") {
    Container(pwa, "PWA shell", "Service worker, web app manifest", "Installs the app, caches the shell, receives push messages and shows notifications")
    Container(web, "ECC App server", "Next.js 16 on Vercel", "Screens (Server Components), server actions, job endpoints. Backend-for-frontend")
  }

  System_Boundary(siteBoundary, "ECC website") {
    Container(cms, "Payload CMS", "Payload 3 inside the website's Next.js app", "REST API with access control: fixtures, players, accounts and the app's collections")
    ContainerDb(db, "Database", "Neon PostgreSQL", "System of record")
  }

  System_Ext(push, "Browser push services", "Apple / Google / Mozilla")
  System_Ext(gha, "GitHub Actions", "Hourly schedule")

  Rel(member, web, "Uses", "HTTPS")
  Rel(member, pwa, "Installs, taps notifications")
  Rel(web, cms, "Reads and writes", "REST, JWT")
  Rel(cms, db, "SQL")
  Rel(web, push, "Sends", "Web Push, VAPID")
  Rel(push, pwa, "Delivers")
  Rel(gha, web, "Triggers jobs", "HTTPS, HMAC-signed")
```

## 5.2 Level 2: feature slices of the ECC App server

| Building block            | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/auth`           | Sign-in against Payload, session cookie, current member and role, route guards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `features/week`           | The player's week (UC-1, UC-2, UC-3, UC-7): `build-week` turns events, answers and practices into the week with deadlines, open answers and the attendance standing (pure, tested); the screen's components. Reads sample data until the backend is connected (`server/sample-week.ts`, same shape).                                                                                                                                                                                                                                                                                                                                                                            |
| `features/availability`   | Going / Not going with reason; change until the deadline; captain and admin views of who answered what.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `features/attendance`     | The member's season as a ledger (UC-7, UC-20): the attendance standing for the next match, the availability targets (counted from the Board's start date) and every practice by month; a missed practice can be corrected on request (UC-18), which the team's captain or an admin accepts or declines on the Team screen.                                                                                                                                                                                                                                                                                                                                                      |
| `features/team`           | The captain's tools for the team they lead, and for an admin standing in for any team (a team switcher): the week's practices and matches, the practice check-in (UC-6, walk-ins and corrections included) and squad selection (UC-9) from the players who said Going, with eligibility and carry-overs marked, nothing preselected, and the 12th man asked for once the XI is full; submission to the Board, after which only the Board can reopen it. One slice, not the planned `practice` and `selection`, because both share the captain's access check and the team's data. Admin approval, selection notices and the player's attendance history come with later slices. |
| `features/spielerpass`    | Spielerpasses (image, name as registered, Pass Nr.); the match day pack and the filled DCB match report sheet for an approved squad (ADR-0007); upload of the signed sheet after the match.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `features/notifications`  | Push subscriptions per device, sending, the scheduled jobs and their send log.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `features/board`          | The Board's screens (admins only): the week's squads, most urgent first; per match the captain's squad to approve and announce or send back with a note (UC-11), the answer deadline (UC-10) and exceptions for blocked players (UC-14). The Board never edits picks. Member management stays in the website's admin panel.                                                                                                                                                                                                                                                                                                                                                     |
| `domain/club-rules`       | Pure rules: practice day for a fixture, attendance window and countdown, deadlines, eligibility. No framework imports.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `shared/backend`          | Typed, `server-only` client for the Payload REST API; responses validated with Zod.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `shared/ui`, `shared/lib` | Design system; dates in Europe/Berlin; formatting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## 5.3 Domain model

Collections marked _(website)_ already exist in the website's Payload; the others are added there for the app (ADR-0002).

```mermaid
classDiagram
  direction LR

  class User {
    email
    role: player | captain | admin
  }
  class Player {
    name
    isEcc1Eligible
  }
  class Team {
    name: ECC I | ECC II
  }
  class Fixture {
    date, startTime
    ground, opponent
  }
  class PracticeSession {
    date
    status: scheduled | cancelled
  }
  class AvailabilityResponse {
    response: going | not-going
    reason
    respondedAt
  }
  class Attendance {
    attended: yes | no
    isWalkIn
  }
  class AvailabilityWindow {
    closesAt
    extendedBy
  }
  class Squad {
    status: draft | submitted | approved | returned
    note
  }
  class SquadMember {
    role: playing | twelfth | reserve
    isCarriedOver
    isException
  }
  class AttendanceCorrection {
    status: requested | accepted | declined
    decidedBy
  }
  class Spielerpass {
    registeredName
    passNumber
    image (private)
    validUntil
  }
  class MatchReport {
    sheetPhoto (private)
    uploadedBy, uploadedAt
  }
  class PushSubscription {
    endpoint, keys
    device
  }
  class NotificationLog {
    kind, subjectId
    sentAt
  }

  User "1" --> "0..1" Player : is
  User "0..*" --> "0..1" Team : captains
  Player "0..*" --> "1" Team : home team
  Fixture "0..*" --> "1" Team : ECC team
  PracticeSession "0..*" --> "1" Team
  PracticeSession "0..1" --> "1" Fixture : prepares for
  AvailabilityResponse "0..*" --> "1" Player
  AvailabilityResponse "0..*" --> "1" Fixture : for a match
  AvailabilityResponse "0..*" --> "1" PracticeSession : or a practice
  Attendance "0..*" --> "1" PracticeSession
  Attendance "0..*" --> "1" Player
  AvailabilityWindow "1" --> "1" Fixture
  Squad "0..1" --> "1" Fixture
  SquadMember "0..*" --> "1" Squad
  SquadMember "0..*" --> "1" Player
  AttendanceCorrection "0..*" --> "1" Attendance : asks to change
  Spielerpass "0..1" --> "1" Player
  MatchReport "0..1" --> "1" Squad : signed sheet for
  PushSubscription "0..*" --> "1" User
  NotificationLog "0..*" --> "1" User
```

Derived, never stored: a player's attendance status (from `Attendance` over their team's last 4 practices), eligibility (attendance rule, ECC I flag, exceptions) and the countdown message.
