# Example Output

A live example of this skill's output is produced for the MediCheck onboarding engagement (see the farmed-visie-fresh repo, `test-catalogue.pdf` at repo root).

Headline shape of that example:
- Cover page with app name, date, and four stat tiles (total / journeys / active / skipped).
- One section per portal (Manager, Administrator, Cross-cutting) with per-priority tables.
- Adversarial-regression section listing every verified-boundary test.
- Skipped-with-reason section documenting scenarios deferred (tenant data, known bugs, 2FA preconditions, etc).

The example is not committed to this repo — keeping client-specific content out of the skill package is intentional. To regenerate an example, run the skill in any project that has `tests/e2e/*.spec.ts` plus a sentinel-bearing `tests/e2e/docs/journey-map.md`.
