# 6. Runtime View

## 6.1 The club's week

```mermaid
sequenceDiagram
  autonumber
  participant GHA as GitHub Actions (hourly)
  participant App as ECC App server
  participant CMS as Payload CMS
  participant Push as Push services
  actor Player
  actor Captain
  actor Admin

  Note over GHA,App: Monday, first tick after 11:00 (Europe/Berlin); daily at 11:00 until answered
  GHA->>App: POST /api/jobs/tick (signed)
  App->>CMS: Fixtures of the week per team
  App->>App: club-rules: practice day per team (Sat → Wed, Sun → Thu)
  App->>CMS: Create practice sessions (idempotent)
  App->>Push: "This week: match Sat vs …, practice Wed. Are you in?"
  Push-->>Player: Notification
  Player->>App: Going / Not going (+ reason)
  App->>CMS: Save availability response

  Note over GHA,App: Practice day, first tick after 21:00
  GHA->>App: tick
  App->>Push: "Mark today's practice: 9 said going"
  Push-->>Captain: Notification
  Captain->>App: Attended / absent, add walk-ins
  App->>CMS: Save attendance
  App->>Push: Countdown to players who missed ("attend 2 of the next 3")

  Note over GHA,App: Availability closes (end of Tuesday, or as extended); the squad is picked after practice, announced by end of Thursday
  GHA->>App: tick
  App->>Push: "Pick your squad: 14 going, 12 eligible"
  Push-->>Captain: Notification
  Captain->>App: Select squad, submit
  App->>CMS: Save squad (submitted)
  App->>Push: "Squad for Saturday waiting for approval"
  Push-->>Admin: Notification
  Admin->>App: Approve
  App->>CMS: Squad approved
  App->>Push: "You are selected for Saturday" / "Not selected this time"
  Push-->>Player: Notification
```

Every scheduled step is idempotent: a step records what it did, so a second tick in the same hour, or a delayed tick, does nothing twice (ADR-0004).

## 6.2 Further scenarios

Added with their slices: sign-in and first-run install guide; answering from a notification; captain adds a walk-in; admin extends a deadline; admin makes an exception; captain opens Spielerpasses on match day.
