# Spec Parsing — Extraction Rules

The catalogue extractor walks spec files line-by-line. No AST needed — the element-interactions convention is regular enough that a scanner suffices.

## Patterns

### Describe blocks
```
test.describe('<name>', ...
test.describe.serial('<name>', ...
test.describe.parallel('<name>', ...
test.describe.skip('<name>', ...
test.describe.configure({ ... })   <- ignore, not a describe
```

Track the describe stack by balancing braces `{` / `}` from the line the describe appears on.

### Tests
Recognise only **statement-position** calls (indent level inside a describe, not inside a test body):

```
test('<name>', async ...
test.skip('<name>', async ...
test.fail('<name>', async ...
test.only(...)                     <- treat as active, warn the user
```

Ignore `test.skip(<condition>, '<reason>')` forms where the first argument is not a string literal — those are runtime skips inside a test body and do not represent structural skips.

### Skip reason capture
If the previous 1–6 lines above a `test.skip('<name>', ...` contain a single-line comment (`// …`) or the tail of a block comment (`* …`), use that as the skip reason. Otherwise fall back to `"Skipped (no reason comment)"`.

### Tags
`@tag` tokens embedded inside the test name string. Canonical tags:
- `@mobile`
- `@security`
- `@regression` (implied by filename but may also be inline)
- `@p0`, `@p1`, `@p2`, `@p3` (priority override — takes precedence over journey-map priority when present)

### Journey ID inference

1. If the outer `describe` name matches `/^(j-|sj-)[a-z0-9-]+/` → take the first token.
2. Else use the file basename minus `.spec.ts` and minus the trailing `-regression` (if present) → prepend `j-`.
3. If neither matches a journey in `journey-map.md`, emit into the `Unmapped` bucket.

## File conventions in this framework

| Pattern | Meaning |
|---|---|
| `<journey>.spec.ts` | Main happy-path / variant file for a journey |
| `<journey>-regression.spec.ts` | Adversarial regression file — all tests inside are `regression` type |
| `sj-<slug>.spec.ts` | Rare; shared sub-journey verification |
| `happy-path.spec.ts` | Golden smoke test covering the whole onboarding chain |
| `pass5-regression-batch.spec.ts` | Cross-cutting regression batch (not tied to a single journey) |

## Journey map extraction

For each `### j-…` heading in `journey-map.md`, read lines until the next blank-line-followed-by-heading. Extract:

- `**Priority:**` → `P0` | `P1` | `P2` | `P3`
- `**Category:**` → free text
- `**Entry:**` → URL; portal inferred from hostname:
  - `acceptatie.medicheckapp.nl` → Manager portal
  - `etdr-acceptatie.medicheckapp.nl` / `acceptatie-etdr.medicheckapp.nl` → Administrator portal
  - anything else → Cross-cutting
- The heading text itself (after the `:`) → journey purpose (one-liner for the catalogue).

## Portal inference fallbacks

If a journey is not in the map (Unmapped), try the file-name prefix:
- `manager-*` → Manager portal
- `admin-*` → Administrator portal
- `role-choice-*`, `happy-path`, `search-sort-*`, `pass5-*` → Cross-cutting
