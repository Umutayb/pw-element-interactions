---
name: test-catalogue
description: >
  Produce a client-ready scenario catalogue PDF from a project's Playwright spec files and journey map.
  Use this skill when asked to "produce a test catalogue", "generate a scenario report", "catalogue the suite",
  "client-ready catalogue", "export the scenario inventory", or any request to produce a stakeholder-facing
  inventory of what scenarios the suite runs and why. Optional and opt-in — it never activates during test
  writing, coverage expansion, or debugging workflows. Runs only after a sentinel-bearing `journey-map.md`
  exists and spec files are in place.
---

# Test Catalogue — Client-Ready Scenario Inventory PDF

Generate a printable, stakeholder-facing catalogue that answers the question **"what scenarios are we running, and why?"** at a glance. The audience is non-technical: a product owner, a manager, a client sponsor. They want to see coverage organised by portal and priority, with a short human-readable line per scenario and a transparent list of anything explicitly deferred.

Output is an A4-landscape PDF (and its HTML source), cover page first, sectioned by portal, sorted by priority, with a dedicated adversarial-regression section and a skipped-with-reason section at the end.

---

## When This Skill Activates

This skill is **on-demand only**.

Activation phrases:
- "produce a test catalogue"
- "generate a scenario report"
- "catalogue the suite"
- "client-ready catalogue"
- "export the scenario inventory"

It does NOT activate during test writing, coverage expansion, repair, or debugging — those belong to the primary `element-interactions` stages. It is a paired document to `work-summary-deck`: the deck tells the narrative, the catalogue lists the inventory.

---

## Required Inputs

| Source | Path | Purpose |
|---|---|---|
| Spec files | `tests/e2e/**/*.spec.ts` | Scenario extraction |
| Journey map | `tests/e2e/docs/journey-map.md` | Must start with `<!-- journey-mapping:generated -->` sentinel. Cross-referenced for priority / category / entry / portal. |

If either input is missing, stop and tell the user — do not fabricate a journey map.

### Optional Inputs

| Source | Path | Effect if present |
|---|---|---|
| App context | `tests/e2e/docs/app-context.md` | Populates the cover-page app summary line |
| Adversarial findings | `tests/e2e/docs/adversarial-findings.md` | Used to distinguish regression specs as "adversarial-regression" |

### Optional Args

| Arg | Default | Effect |
|---|---|---|
| `brand: <name>` | generic dark-mode | Overrides the cover/accent palette. Known brands: `spritecloud` (blue `#00A3FF` + orange `#FF7A1A`), `civitas-cerebrum` (green `#3fb950`). |
| `output: <path>` | `test-catalogue.pdf` | Output PDF filename at repo root |

---

## Phases

### Phase 1 — Extract

For every `tests/e2e/**/*.spec.ts`:

1. Parse the file content.
2. Capture each `test.describe(...)` context (nesting allowed).
3. For each `test(...)`, `test.skip(...)`, or `test.fail(...)` that appears at statement position (ignore inner `test.skip(condition, 'msg')` calls inside test bodies — those are runtime skips, not structural skips):
   - File path (relative to repo root)
   - Enclosing describe chain
   - Test name (the first string argument)
   - Marker: `active | skipped | failing-expected`
   - Any `@tag` substrings inside the test name (e.g., `@mobile`, `@security`)
4. Determine the journey ID from either:
   - The outer `describe` name if it starts with `j-` or `sj-`, or
   - The file-name convention: `<portal>-<slug>.spec.ts` → attempt matching `j-<portal>-<slug>` against journey-map headings.

Implementation hint: a tolerant regex-based walk is sufficient. You do not need a real AST — spec files in this framework follow predictable patterns (see `references/spec-parsing.md`).

### Phase 2 — Cross-reference

Load `journey-map.md`. For each `### j-…` heading, extract the metadata block that follows (Priority, Category, Entry, Portal-inferred-from-Entry). Build a lookup table.

For each extracted test:
- If its journey matches → attach priority, category, portal, short purpose (the heading text).
- If the spec file name ends in `-regression.spec.ts` → mark as `adversarial-regression` and, when adversarial-findings.md lists a matching boundary (`VB-NN` or `P4-…` code), attach that code.
- If the enclosing describe starts with `sj-` → mark as `structural` (these are composed into journeys rather than being user-facing journeys themselves).
- If the test is `test.skip` at statement position → keep the skip + capture any human-readable reason from a nearby comment on the preceding lines (best-effort).

Unmatched tests go into an "Unmapped" bucket in the catalogue — visible so the user sees what needs mapping.

### Phase 3 — Categorise

Primary grouping is **portal** (read from journey-map Entry URL prefix or the file-name prefix):
- Manager portal
- Administrator portal
- Cross-cutting (sub-journeys, regression-only specs spanning both)

Within each portal, sort by **priority tier** (P0 → P3). Within a tier, sort **alphabetically by journey ID**.

Every active scenario gets a `type` label inferred from the test name keywords:
- happy path (the first non-error test in a non-regression spec)
- error state (name contains `error`, `invalid`, `reject`, `blank`, `duplicate`, `unauthorized`, `401`, `403`)
- edge case (name contains `edge`, `boundary`, `empty`, `max`, `min`, `overflow`, `timeout`, `concurrent`)
- mobile (name or `@tag` contains `mobile`, `iPad`, `small screen`)
- structural (sub-journey / smoke nav)
- regression (file in `-regression.spec.ts`)

When a test matches more than one rule, pick the **most specific** one (mobile > edge > error > structural > regression > happy path).

### Phase 4 — Render HTML

The catalogue is a sequence of A4-landscape "pages" (CSS `page-break-after: always`).

Every page has a header (brand wordmark + section micro-label + page-number `NN / TOTAL`) and a consistent 64px horizontal padding.

Page order:

1. **Cover page** — app name, date, headline totals (total scenarios, journeys covered, portal breakdown, active-vs-skipped count).
2. **Contents page** — section list with starting page numbers.
3. **One or more pages per portal.** For each portal:
   - Section header page (portal name, portal one-liner, scenario count, priority distribution).
   - Table pages grouped by priority tier. Columns: `Journey` · `Scenario` · `Type` · `Status`. When the table overflows, continue on the next page with the same headers.
4. **Adversarial regression section.** Table of every boundary-lock test with file, test name, verified-boundary code (if extractable), and category.
5. **Skipped-with-reason section.** Full list of every skipped test grouped by reason (env, blocked by tenant data, known bug, etc). This page is the transparency commitment — it must exist even when empty (rendering an explicit "No scenarios deferred" block).

Styling rules:
- A4 landscape: `1123 × 794 px` at 96dpi. CSS must declare `@page { size: A4 landscape; margin: 0; }` and every page must be `page-break-after: always`.
- Dark-mode default palette, tuned for print (see below). Must include `-webkit-print-color-adjust: exact; print-color-adjust: exact;` so Chromium honours the dark background in PDF.
- Typography: Inter via Google Fonts, fallback to system sans.
- Tables: zebra rows at low opacity (`rgba(255,255,255,0.02)`), 1px rule below the header, tight line-height.
- Priority chips: P0 = crit red, P1 = high orange, P2 = medium yellow, P3 = low grey.
- Status chips: `Active` = ok-green, `Skipped` = mute-grey, `Failing-expected` = accent-orange.
- Never include runtime / effort / "we wrote this in X hours" language. Never include an author block.
- Screenshots (if the template references any) must always use `screenshots/<file>.png` path-qualified, never bare basenames (§3.0 convention).

### Phase 5 — Render PDF

Use Playwright Chromium (already a project dep for element-interactions projects):

```js
const { chromium } = require('@playwright/test');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  landscape: true,
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});
await browser.close();
```

If the project already has `scripts/render-deck-pdf.js`, extend it or write a sibling `scripts/render-catalogue-pdf.js` — do not duplicate the chromium wiring in the skill's own assets when an in-project renderer exists.

After render, read the first page of the PDF back (`Read` tool with `pages: "1-1"`) to confirm the cover page renders with dark background intact.

---

## Palette (default, print-tuned dark)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0A0E14` | Page background |
| `--ink` | `#E6EAF2` | Body text |
| `--ink-mute` | `#8892A6` | Subtitles, muted copy |
| `--brand` | `#00A3FF` | Primary chips, accents, underlines |
| `--accent` | `#FF7A1A` | Secondary accents, warnings |
| `--crit` | `#FF5757` | P0 chips |
| `--high` | `#FF8A3D` | P1 chips |
| `--med` | `#FFC93D` | P2 chips |
| `--low` | `#9CA3AF` | P3 chips |
| `--ok` | `#34D399` | Active-status chips |

Brand overrides:
- `brand: spritecloud` — same palette as above (this is already the default alignment).
- `brand: civitas-cerebrum` — swap `--brand` to `#3fb950`, keep `--accent` at `#58a6ff`, use `#0d1117` as `--bg`.

---

## Context discipline

This skill is a **single-run** skill. No parallel subagents. No orchestration. No MCP browser work. It reads spec files and the journey map, writes HTML + PDF, and exits.

If spec parsing produces an Unmapped bucket with > 10 tests, **warn the user** that the journey map is stale — do not try to auto-repair it. Repair belongs to the `journey-mapping` skill.

---

## Do Not

- Brag about runtime, effort, or velocity. The audience cares about coverage, not how long it took.
- Include API internals, package versions, or implementation detail the client did not ask for.
- Duplicate the `work-summary-deck` narrative. This is an inventory, not a story.
- Fabricate journey metadata. If a spec's journey is unknown, list it in Unmapped.
- Introduce screenshots without path-qualification.

---

## Example Prompts

**User says:** "produce a test catalogue for the client"
1. Parse `tests/e2e/**/*.spec.ts`.
2. Cross-reference `journey-map.md`.
3. Render `test-catalogue.html` and `test-catalogue.pdf` at repo root.
4. Report headline numbers (total scenarios, journeys covered, portal breakdown, skipped count).

**User says:** "catalogue the suite, brand: spritecloud, output: medicheck-catalogue.pdf"
1. Same flow, palette forced to spritecloud, output filename overridden.
2. Report the three-line headline.

**User says:** "scenario report including regression coverage"
1. Same flow. The adversarial-regression section is always included — it is not opt-in.
