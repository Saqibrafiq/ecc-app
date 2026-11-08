# 0007. Fill the official DCB match report sheet as a PDF

- Status: accepted
- Date: 2026-11-08

## Context

Before every league match both teams enter their players on the DCB match report sheet (DCB-Spielberichtsbogen): name as registered and Spielerpass number, plus date, ground, competition and division. Both captains and the umpires sign it; under § 25 DCB-SPO the winning team emails a scan to the league by 22:00 on the Tuesday after the match. Today the captain fills it by hand.

Once the Board approves a squad, the app knows everything ECC has to enter. The captain needs a sheet that can be printed and signed, and that the umpire accepts at a glance. The project runs at €0.

## Decision Drivers

- The umpire and the league expect the official form, not a look-alike.
- Printed and signed on paper, so a PDF is the deliverable.
- €0, no external service; personal data (registered names, pass numbers) stays on the club's servers.
- Correct for home and away matches.

## Considered Options

1. **Fill the official blank PDF on the server** with `pdf-lib` (MIT): write ECC's details into the form's fields at fixed positions; the captain downloads the result.
2. Render an HTML page that imitates the form and let the browser print it.
3. A PDF generation service.
4. Keep filling it by hand.

## Decision

Option 1.

- The blank sheet (a public DCB form) is kept in the repository; a server route renders it for an approved squad and returns a PDF, only to the team's captain and admins.
- What the app fills: date, ground, competition, division, and ECC's block (Home or Away, from the fixture): rows 1–11 the playing XI, row A1 the 12th man, row A2 the first reserve, rows B1 and B2 (team officials) left for the captain (Q-15), each with the name as registered and the Pass Nr. The opponent's block, the toss, the umpires, the result and the signatures stay empty for the match.
- Which player goes in which row is decided by a pure domain function, tested like the club rules; the PDF route only draws.
- A missing Spielerpass number is flagged to the captain and the admin before the sheet is created.
- Option 2 depends on each browser's print layout and is not the official form. Option 3 sends personal data to a third party. Option 4 is what the app removes.

## Consequences

- Good: the captain prints a correct, official sheet in seconds; no typing of pass numbers at the ground.
- Good: names and numbers come from the Spielerpass records the admin maintains, so they match the league's registration.
- Bad: field positions depend on the form's layout. If the DCB changes the form, the template and positions must be updated (risk R-7). Mitigation: a test renders the sheet and checks every field lands inside its box.
- Neutral: the signed sheet comes back into the app as a photo uploaded by the captain (UC-22), stored privately like Spielerpasses.
