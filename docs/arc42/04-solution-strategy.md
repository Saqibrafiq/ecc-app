# 4. Solution Strategy

| Quality goal / constraint | Approach                                                                                                                                                                                              | Decision |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| €0 on iPhone and Android  | An installable **PWA** instead of a native app: one codebase, no store fees, instant updates. Web Push for notifications (iOS 16.4+ once added to the Home Screen).                                   | ADR-0001 |
| One source of truth       | The website's **Payload CMS is the system of record**. Fixtures and players are read from it; responses, attendance, squads and Spielerpasses are new collections there. Nothing is copied.           | ADR-0002 |
| Privacy & security        | **Backend-for-frontend**: the browser talks only to this app; its server calls Payload with the member's token. Role checks run in server actions _and_ in Payload access control (defence in depth). | ADR-0002 |
| Correctness               | The club rules (practice days, 2-of-4 attendance, deadlines, eligibility) are **pure TypeScript in `src/domain/club-rules`**, 100% branch-covered, tested across daylight-saving changes.             | ADR-0005 |
| Reliability               | **Hourly, idempotent scheduled jobs** triggered by GitHub Actions. Each job asks "what is due now in Europe/Berlin?" and records what it sent, so retries and DST shifts never double-send or skip.   | ADR-0004 |
| Usability                 | Mobile-first, thumb-first design; answers in one tap from a notification (notification actions where supported); offline reading; Motion for feedback.                                                | §8       |
| Maintainability           | Same architecture as the website: modular monolith with vertical feature slices, public `index.ts` per feature, layering enforced by dependency-cruiser; arc42 + ADRs.                                | ADR-0002 |

## 4.1 Technology decisions

Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript strict, Tailwind CSS v4 with tokens, shadcn/ui, Motion, next-intl, Zod, `web-push`. Tests with Vitest, RTL, MSW, Playwright and axe. Code quality with ESLint, Prettier and dependency-cruiser; Husky, lint-staged and commitlint; CI on GitHub Actions with SonarCloud and Lighthouse CI; Storybook. Deployed on Vercel Hobby.

## 4.2 Decomposition

Vertical slices that follow the club's week: `events` (the week's fixtures and practices), `availability` (answers), `practice` (attendance), `selection` (squad, approval), `spielerpass`, `notifications` (subscriptions, sending, scheduled jobs), `auth` and `admin`. The rules they share live in `domain/club-rules`. See [section 5](05-building-block-view.md).

## 4.3 Organisational approach

Built in vertical slices, each shippable on its own: sign-in and roles → events and availability → practice attendance → selection and approval → Spielerpass → notifications. Backend collections for a slice are added to the website repo in the same step.
