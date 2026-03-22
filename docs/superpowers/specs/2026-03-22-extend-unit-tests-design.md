# Extend Unit Tests to Cover All Vue Test App Components

**Date:** 2026-03-22
**Status:** Plan — ready for execution

---

## 1. Overview

The vue-test-app at `https://umutayb.github.io/vue-test-app/` has **37 components across 8 categories**. The existing `unit-tests.spec.ts` covers core API surface (click, fill, selectDropdown, dragAndDrop, verifyPresence/Absence/Count/Text/State, waitForState, clickRandom, navigateTo). This plan extends test coverage to exercise **every component type** on the app, adding new Steps API methods where the current API has gaps.

---

## 2. New Steps API Methods Required

The following interaction types exist on the app but have **no corresponding Steps API method**:

### 2.1 `rightClick(pageName, elementName)`
- **Why:** The Alerts page has a "Right Click Me" button that triggers a context-menu-driven action.
- **Layer:** Add `rightClick(locator)` to `Interactions.ts`, expose via `Steps.rightClick(pageName, elementName)`.
- **Implementation:** `await locator.click({ button: 'right' })`.

### 2.2 `doubleClick(pageName, elementName)`
- **Why:** The Alerts page has a "Double Click Me" button.
- **Layer:** Add `doubleClick(locator)` to `Interactions.ts`, expose via `Steps.doubleClick(pageName, elementName)`.
- **Implementation:** `await locator.dblclick()`.

### 2.3 `check(pageName, elementName)` / `uncheck(pageName, elementName)`
- **Why:** The Checkboxes & Toggles page has checkboxes and toggle switches. `click` works but `check`/`uncheck` are idempotent and semantically clearer.
- **Layer:** Add `check(locator)` and `uncheck(locator)` to `Interactions.ts`, expose via Steps.
- **Implementation:** `await locator.check()` / `await locator.uncheck()`.

### 2.4 `setSliderValue(pageName, elementName, value)`
- **Why:** The Sliders page has `<input type="range">` elements. `fill()` doesn't work on range inputs.
- **Layer:** Add `setSliderValue(locator, value)` to `Interactions.ts`, expose via Steps.
- **Implementation:** `await locator.fill(String(value))` (Playwright supports fill on range inputs) — if not, fall back to bounding-box-based mouse drag.

### 2.5 `verifyInputValue(pageName, elementName, expectedValue)`
- **Why:** Multiple pages need to verify the current value of `<input>`, `<select>`, or `<textarea>` elements (forms, sliders, counters). `verifyText` checks `textContent`, not the `value` property.
- **Layer:** Add `inputValue(locator, expected)` to `Verifications.ts`, expose via Steps.
- **Implementation:** `await expect(locator).toHaveValue(expectedValue)`.

### 2.6 `pressKey(key)` (page-level, no element)
- **Why:** Some interactions require keyboard shortcuts (Escape to close modals/drawers, Enter to submit).
- **Layer:** Add to `Interactions.ts` and expose via Steps.
- **Implementation:** `await this.page.keyboard.press(key)`.

### 2.7 Tab/Window Management (Navigation-level)

#### `switchToNewTab(action)` → `Promise<Page>`
- **Why:** Alerts page has "New Tab", "New Window", and "New Window Message" buttons that open new browser tabs/windows.
- **Layer:** Add to `Navigation.ts`, expose via Steps.
- **Implementation:** Wrap `page.context().waitForEvent('page')` around the triggering action, wait for the new page to load, return it.

#### `closeCurrentTab()` → `Promise<void>`
- **Why:** After verifying a new tab's content, tests need to close it and return to the original tab.
- **Layer:** Add to `Navigation.ts`, expose via Steps.
- **Implementation:** `await page.close()`, reassign internal page to the previous page in context.

#### `getTabCount()` → `Promise<number>`
- **Why:** Verify the expected number of open tabs after opening/closing.
- **Layer:** Add to `Navigation.ts`, expose via Steps.
- **Implementation:** `return page.context().pages().length`.

#### `verifyTabCount(expected)` → `Promise<void>`
- **Why:** Assertion wrapper for tab count.
- **Layer:** Add to `Verifications.ts`, expose via Steps.
- **Implementation:** `expect(page.context().pages().length).toBe(expected)`.

---

## 3. Components & Test Coverage Plan

Each section below maps to a category on the homepage. Tests navigate from the homepage via card clicks (never direct URL).

### 3.1 Elements (navigate via `elementsCard` → `/radiobuttons`)

**Already covered:** Radio buttons (TC_007 — verifyState checked/disabled).

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Buttons | Click sidebar/nav to Buttons page | Click button, verify result message; right-click button; double-click button | `click`, `rightClick` (new), `doubleClick` (new), `verifyText` |
| Text Inputs | Nav to Text Inputs page | Fill input, verify value; clear and refill; typeSequentially with debounce | `fill`, `typeSequentially`, `verifyInputValue` (new) |
| Checkboxes & Toggles | Nav to Checkboxes page | Check checkbox, verify checked; uncheck, verify unchecked; toggle switch | `check` (new), `uncheck` (new), `verifyState('checked')` |
| Sliders | Nav to Sliders page | Set slider value, verify value displayed | `setSliderValue` (new), `verifyText` |
| Slider Indicator | Nav to Slider Indicator | Move slider, verify indicator updates | `setSliderValue` (new), `verifyText` |
| Drag Progress | Nav to Drag Progress | Drag element by offset, verify progress | `dragAndDrop` (offset mode), `verifyText` |

### 3.2 Forms (navigate via `formsCard` → `/forms`)

**Already covered:** Full Form (TC_001 — fill, selectDropdown, click, verifyText, datepicker).

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Dropdown (vue-select) | Nav to Dropdown page | Type to search, select from filtered list | `typeSequentially`, `click`, `verifyText` |
| File Upload | Nav to File Upload page | Upload a file, verify file name displayed | `uploadFile`, `verifyText` |
| Autocomplete | Nav to Autocomplete page | Type partial text, wait for suggestions, click suggestion, verify selection | `typeSequentially`, `waitForState`, `click`, `verifyText` |

### 3.3 Alerts, Frame & Windows (navigate via `alertsCard` → `/alerts`)

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Alerts — Click Me | Already on alerts page | Click button, verify alert message appears | `click`, `verifyPresence`, `verifyText` |
| Alerts — Right Click | Already on alerts page | Right-click button, verify context action | `rightClick` (new), `verifyText` |
| Alerts — Double Click | Already on alerts page | Double-click button, verify action | `doubleClick` (new), `verifyText` |
| Modal | Nav to Modal page | Open modal, verify content, close modal, verify absence | `click`, `verifyPresence`, `verifyText`, `verifyAbsence` |
| Toast | Nav to Toast page | Trigger toast, verify toast appears and auto-dismisses | `click`, `verifyPresence`, `waitForState('hidden')` |
| New Tab | Already on alerts page | Click "New Tab" → switchToNewTab → verify content → closeCurrentTab → verify back | `switchToNewTab` (new), `closeCurrentTab` (new), `verifyTabCount` (new), `verifyText` |
| New Window | Already on alerts page | Click "New Window" → switch → verify → close | `switchToNewTab` (new), `closeCurrentTab` (new) |
| New Window Message | Already on alerts page | Click "New Window Message" → switch → verify message → close | `switchToNewTab` (new), `verifyText`, `closeCurrentTab` (new) |
| Tooltip & Popover | Nav to Tooltip page | Hover to show tooltip, verify text; click for popover | `hover`, `verifyPresence`, `verifyText`, `click` |
| Drawer | Nav to Drawer page | Open drawer, verify content, close drawer (Escape or click) | `click`, `verifyPresence`, `pressKey` (new), `verifyAbsence` |

### 3.4 Widgets (navigate via `widgetsCard` → `/tabs`)

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Tabs | Already on tabs page | Click each tab, verify corresponding content visible | `click`, `verifyText`, `verifyPresence` |
| Accordion | Nav to Accordion page | Expand section, verify content; collapse, verify hidden | `click`, `verifyPresence`, `verifyAbsence` |
| Progress | Nav to Progress page | Verify progress bar value/width, trigger progress, verify update | `verifyAttribute`, `click`, `verifyText` |
| Table | Nav to Table page | Verify row count, verify cell text, sort column, verify order changes | `verifyCount`, `verifyText`, `click`, `getText` |

### 3.5 Interactions (navigate via `interactionsCard` → `/sortable`)

**Already covered:** Sortable drag-and-drop (TC_002).

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Draggable | Nav to Draggable page | Drag element by offset, verify new position | `dragAndDrop` (offset), `verifyText` or `verifyAttribute` |
| Droppable | Nav to Droppable page | Drag item to drop zone, verify drop accepted | `dragAndDrop` (target), `verifyText` |
| Resizable | Nav to Resizable page | Drag resize handle, verify size changed | `dragAndDrop` (offset), `getAttribute` |
| Tall Page | Nav to Tall Page | Scroll to bottom element, verify in viewport | `scrollIntoView`, `verifyState('inViewport')` |
| Kanban | Nav to Kanban page | Drag card between columns | `dragAndDropListedElement`, `verifyTextContains` |
| Infinite Scroll | Nav to Infinite Scroll page | Scroll down, verify new items loaded (count increases) | `scrollIntoView`, `verifyCount({ greaterThan })` |
| Loading States | Nav to Loading States page | Trigger load, wait for loading to finish, verify content | `click`, `waitForState`, `verifyPresence` |
| Dynamic Form | Nav to Dynamic Form page | Add field dynamically, fill it, verify | `click`, `fill`, `verifyCount`, `verifyInputValue` (new) |

### 3.6 Media (navigate via `mediaCard` → `/gallery`)

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Image Gallery | Already on gallery page | Verify all images loaded correctly | `verifyImages`, `verifyCount` |
| Carousel | Nav to Carousel page | Click next/prev, verify image changes | `click`, `verifyAttribute` (src changes) |

### 3.7 Auth & State (navigate via `authStateCard` → `/loginForm`)

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Login Form | Already on login page | Fill credentials, submit, verify success; wrong password, verify error | `fill`, `click`, `verifyText`, `verifyPresence` |
| Pinia Counter | Nav to Counter page | Click increment/decrement, verify count updates | `click`, `verifyText` |

### 3.8 Edge Cases (navigate via `edgeCasesCard` → `/longList`)

**New tests needed:**

| Component | Navigation | Scenarios | API Used |
|---|---|---|---|
| Long List | Already on long list page | Verify initial count, search/filter, verify filtered count | `fill` or `typeSequentially`, `verifyCount`, `verifyText` |
| Multi-step Form | Nav to Multi-step Form page | Fill step 1 → next → fill step 2 → next → verify summary | `fill`, `click`, `verifyText` |
| State Viewer | Nav to State Viewer page | Interact with controls, verify state display updates | `click`, `fill`, `verifyText` |

---

## 4. Page Repository Additions

Each new page above will need locator entries in `page-repository.json`. Before adding any locator:
1. Navigate to the page via Playwright MCP
2. Inspect the live DOM for `data-testid`, `id`, or stable CSS selectors
3. Propose additions to the user for approval

Estimated new pages to add: ~20 (Buttons, TextInputs, Checkboxes, Sliders, SliderIndicator, DragProgress, Dropdown *(exists)*, FileUpload, Autocomplete, Modal, Toast, Tooltip, Drawer, Tabs, Accordion, Progress, Table, Draggable, Droppable, Resizable, Kanban, InfiniteScroll, LoadingStates, DynamicForm, Carousel, PiniaCounter, MultiStepForm, StateViewer).

---

## 5. Execution Order

### Phase 1 — Implement new Steps API methods
1. `rightClick` — Interactions.ts + Steps
2. `doubleClick` — Interactions.ts + Steps
3. `check` / `uncheck` — Interactions.ts + Steps
4. `setSliderValue` — Interactions.ts + Steps
5. `verifyInputValue` — Verifications.ts + Steps
6. `pressKey` — Interactions.ts + Steps
7. Export new types/methods from package index
8. Build and verify compilation

### Phase 2 — Add page-repository entries
- Inspect each page via Playwright MCP
- Add locators page by page (with user approval)

### Phase 3 — Write tests (grouped by category)
Write tests one category at a time, running after each to confirm green:
1. Elements (Buttons, Text Inputs, Checkboxes, Sliders, Drag Progress)
2. Forms (Dropdown, File Upload, Autocomplete)
3. Alerts (Click/Right-click/Double-click, Modal, Toast, Tooltip, Drawer)
4. Widgets (Tabs, Accordion, Progress, Table)
5. Interactions (Draggable, Droppable, Resizable, Tall Page, Kanban, Infinite Scroll, Loading States, Dynamic Form)
6. Media (Gallery, Carousel)
7. Auth & State (Login Form, Pinia Counter)
8. Edge Cases (Long List, Multi-step Form, State Viewer)

### Phase 4 — Final validation
- Run full test suite
- Verify all tests pass
- Commit

---

## 6. Test File Organization

All new tests go in `tests/unit-tests.spec.ts` as new `test.describe` blocks, following the existing naming pattern (`TC_009`, `TC_010`, etc.). If the file becomes too large (>500 lines), split into category-specific files (e.g., `tests/elements.spec.ts`, `tests/alerts.spec.ts`).

---

## 7. Out of Scope

- **iframe interactions** — No iframes detected on the current app.
- **File download verification** — Not present in the app.
