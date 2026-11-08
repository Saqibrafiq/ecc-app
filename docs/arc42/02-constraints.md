# 2. Constraints

## 2.1 Technical constraints

| Constraint                       | Background / consequence                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **€0 running cost**              | Only free tiers and open-source software. No Apple Developer Program (US$99/year), so no native iOS app; the app is a PWA (ADR-0001).                              |
| **iOS web push needs iOS 16.4+** | Push only works when the app is added to the Home Screen from Safari. The app guides members through it and shows who has push switched on.                        |
| **Shared system of record**      | Fixtures, teams, players and accounts live in the website's Payload CMS (Neon Postgres). This app adds collections there and never keeps a second copy (ADR-0002). |
| **Vercel Hobby**                 | Serverless functions with execution limits; Vercel's own cron runs at most daily on Hobby, so scheduling uses GitHub Actions (ADR-0004).                           |
| **Neon free tier**               | Scale-to-zero: the first request after idle is slower. Jobs and notifications must tolerate a cold start.                                                          |
| **Fixed stack**                  | As listed in [section 4.1](04-solution-strategy.md#41-technology-decisions), matching the website so one developer works in one ecosystem. Changes need an ADR.    |

## 2.2 Organisational constraints

| Constraint              | Background / consequence                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| One developer           | Low operational overhead; one deployment; automation over manual steps.                              |
| Season rhythm           | Matches at weekends from April to September; practices midweek. Rules are tuned to that rhythm.      |
| Club decides club rules | The attendance rule, deadlines and eligibility are club policy; the president decides them.          |
| Portfolio visibility    | Public repository; documentation is part of the product. No AI attribution in code, commits or docs. |

## 2.3 Conventions

- arc42 for architecture documentation, MADR for decisions, C4 diagrams in Mermaid.
- Conventional Commits, trunk-based development, squash merges.
- English (default) and German UI.
- All club times in Europe/Berlin.
