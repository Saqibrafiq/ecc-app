# 0005. Club rules as a pure, fully tested domain module

- Status: accepted
- Date: 2026-11-08

## Context

The app's value rests on a few rules that decide who plays: practice day per fixture (Saturday match → Wednesday, Sunday → Thursday), attendance (2 of the team's last 4 practices), the countdown message, availability deadlines with extensions, ECC I eligibility and admin exceptions. They are used by screens, server actions and scheduled jobs, and may one day be reused by a native app (ADR-0001).

## Decision Drivers

- Correctness is the top quality goal.
- The same rule must give the same answer in every place it is used.
- Time logic must be correct across DST changes.
- Reuse outside Next.js.

## Considered Options

1. **A pure TypeScript module `src/domain/club-rules`**: no framework imports, inputs in, decisions out, 100% branch coverage.
2. Rules inside server actions and job handlers.
3. Rules in Payload hooks on the website.

## Decision

Option 1.

- Functions take plain data and an explicit `now` (never read the clock themselves), e.g. `getPracticeDay(fixtureDate)`, `getAttendanceStatus(practices, attendance)`, `getCountdown(status)`, `getDeadline(fixture, extension)`, `getEligibility(player, team, status, exception)`.
- Times are computed in Europe/Berlin and returned as UTC instants.
- Tests use fixed clocks, including the weeks of the March and October clock changes.
- Option 2 scatters and duplicates rules. Option 3 hides them in another repo and couples them to Payload.

## Consequences

- Good: one tested truth for every caller; easy to explain to the board; reusable by an Expo app.
- Good: changing a club rule (e.g. 3 of 5) is one constant and its tests.
- Bad: callers must load the inputs (practices, attendance) first. Acceptable; the server queries do that once per screen.
