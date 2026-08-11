import { test, expect } from './fixture/StepFixture';
import { errors, type Page } from '@playwright/test';
import { Interactions, classifyClickFailure, isTimeoutError } from '../src/interactions/Interaction';
import { WebElement } from '@civitas-cerebrum/element-repository';

/**
 * Regression tests for the click double-fire defect in
 * Interactions.clickWithInterceptionRetry.
 *
 * The capped (5s max) first click attempt can time out AFTER Playwright has
 * already dispatched the click's input — on slow environments the
 * actionability wait consumes almost the whole cap and the input lands right
 * at the deadline. The old catch-all branch then blind-re-clicked with the
 * full timeout, which:
 *   (a) inverts toggle-style controls the first click just switched on, and
 *   (b) wedges forever against an overlay/drawer the first click just opened.
 * The fix classifies the failed attempt by its call-log phase and only
 * retries when the log proves input was never dispatched.
 *
 * Like tests/upload-drop-unit.spec.ts, the Interactions-level tests here use
 * page.setContent() — no server required — because reproducing the deadline
 * race deterministically needs precise control over the page's main thread.
 */

/**
 * Renders a click-counting button and returns its WebElement. The page keeps
 * an authoritative count in `window.__clicks` so a double-fired click is
 * directly observable (count 2 instead of 1).
 */
async function pageWithCountingButton(page: Page, disabled = false): Promise<WebElement> {
    await page.setContent(`
        <button id="btn" ${disabled ? 'disabled' : ''}>Click me</button>
        <div id="count" data-testid="click-count">0</div>
        <script>
            window.__clicks = 0;
            document.getElementById('btn').addEventListener('click', () => {
                window.__clicks++;
                document.getElementById('count').textContent = String(window.__clicks);
            });
        </script>
    `);
    return new WebElement(page.locator('#btn'));
}

test.describe('Click retry safety (no double fire)', () => {
    test('deadline click: input dispatched at the timeout is NOT re-clicked', async ({ page }, testInfo) => {
        test.setTimeout(60000);
        const button = await pageWithCountingButton(page);

        // A one-shot handler blocks the renderer for 6s as soon as the click's
        // input arrives — longer than the 5s first-attempt cap, so the attempt
        // times out in the "performing click action" phase AFTER input was
        // dispatched. The generous overall budget (15s) deliberately OUTLIVES
        // the block, so the old blind retry had time to land a real second
        // click: this reproduces the production signature (count === 2), not
        // merely a different error.
        await page.evaluate(() => {
            document.getElementById('btn')!.addEventListener('click', () => {
                const end = Date.now() + 6000;
                while (Date.now() < end) { /* block the renderer */ }
            }, { once: true });
        });

        const interactions = new Interactions(page, 15000);

        // Must resolve (click treated as delivered), not throw and not re-click.
        await interactions.click(button);

        // Causal assertion: exactly ONE click reached the page, and it stays
        // one for longer than the old retry would have needed to land a second.
        await expect.poll(() => page.evaluate(() => (window as unknown as { __clicks: number }).__clicks), {
            timeout: 10000,
        }).toBe(1);
        await page.waitForTimeout(2000);
        expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(1);

        // The decision must be report-visible, mirroring interception-fallback.
        const note = testInfo.annotations.find(a => a.type === 'deadline-click');
        expect(note, 'expected a deadline-click annotation on the test').toBeTruthy();
        expect(note?.description).toContain('performing click action');
    });

    test('never-actionable click stays inside the caller budget instead of cap + full retry', async ({ page }) => {
        test.setTimeout(60000);
        // Button never becomes enabled, so the click can only fail. The old
        // shape paid the 5s capped attempt AND a fresh full-timeout retry
        // (~13s for an 8s budget); the continuation now runs on the REMAINING
        // budget, so total elapsed stays bounded by the caller's timeout.
        const button = await pageWithCountingButton(page, true);
        const interactions = new Interactions(page, 8000);

        const started = Date.now();
        await expect(interactions.click(button)).rejects.toThrow();
        const elapsed = Date.now() - started;

        expect(elapsed, `expected the failure inside the 8s budget, took ${elapsed}ms`).toBeLessThan(11000);
        expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(0);
    });

    test('waiting-phase timeout: full-timeout retry is preserved and clicks exactly once', async ({ page }, testInfo) => {
        test.setTimeout(60000);
        // Button starts disabled and only becomes enabled AFTER the 5s
        // first-attempt cap, so the capped attempt provably times out while
        // still "waiting for element to be visible, enabled and stable" —
        // input was never dispatched, and the retry must still happen.
        const button = await pageWithCountingButton(page, true);
        await page.evaluate(() => {
            setTimeout(() => document.getElementById('btn')!.removeAttribute('disabled'), 6000);
        });

        const interactions = new Interactions(page, 15000);
        await interactions.click(button);

        expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(1);
        expect(testInfo.annotations.find(a => a.type === 'deadline-click')).toBeFalsy();
    });

    test('fast path: an immediately actionable click is unchanged', async ({ page }, testInfo) => {
        const button = await pageWithCountingButton(page);

        const interactions = new Interactions(page);
        await interactions.click(button);

        expect(await page.evaluate(() => (window as unknown as { __clicks: number }).__clicks)).toBe(1);
        expect(testInfo.annotations.find(a => a.type === 'deadline-click')).toBeFalsy();
        expect(testInfo.annotations.find(a => a.type === 'interception-fallback')).toBeFalsy();
    });
});

test.describe('classifyClickFailure', () => {
    // Verbatim Playwright call-log shapes (same format as the CI traces that
    // proved the defect: toggle inversion and open-then-wedge).
    const deadlineTimeout = () => {
        const err = new Error([
            'locator.click: Timeout 5000ms exceeded.',
            'Call log:',
            "  - waiting for locator('#btn')",
            '  -   locator resolved to <button id="btn">Click me</button>',
            '  - attempting click action',
            '  -   waiting for element to be visible, enabled and stable',
            '  -   element is visible, enabled and stable',
            '  -   scrolling into view if needed',
            '  -   done scrolling',
            '  -   performing click action',
        ].join('\n'));
        err.name = 'TimeoutError';
        return err;
    };

    const waitingPhaseTimeout = () => {
        const err = new Error([
            'locator.click: Timeout 5000ms exceeded.',
            'Call log:',
            "  - waiting for locator('#btn')",
            '  -   locator resolved to <button disabled id="btn">Click me</button>',
            '  - attempting click action',
            '  -   waiting for element to be visible, enabled and stable',
            '  -   element is not enabled',
            '  - retrying click action',
            '  -   waiting 20ms',
        ].join('\n'));
        err.name = 'TimeoutError';
        return err;
    };

    const interceptionTimeout = () => {
        const err = new Error([
            'locator.click: Timeout 5000ms exceeded.',
            'Call log:',
            "  - waiting for locator('#btn')",
            '  - attempting click action',
            '  -   waiting for element to be visible, enabled and stable',
            '  -   element is visible, enabled and stable',
            '  -   scrolling into view if needed',
            '  -   done scrolling',
            '  -   performing click action',
            '  -   <div id="overlay"></div> from <body> subtree intercepts pointer events',
            '  - retrying click action',
        ].join('\n'));
        err.name = 'TimeoutError';
        return err;
    };

    test('timeout that reached input dispatch is input-may-have-fired', () => {
        expect(classifyClickFailure(deadlineTimeout())).toBe('input-may-have-fired');
    });

    test('timeout still in an actionability waiting phase is not-dispatched', () => {
        expect(classifyClickFailure(waitingPhaseTimeout())).toBe('not-dispatched');
    });

    test('interception wins over performing click action (input was NOT dispatched)', () => {
        expect(classifyClickFailure(interceptionTimeout())).toBe('interception');
    });

    test('hard errors are fatal — never swallowed as a delivered click, never re-clicked', () => {
        // Same call log shape, but not a timeout — e.g. the page closed
        // mid-action. Must surface as-is rather than be masked by another click.
        const hardError = new Error([
            'locator.click: Target page, context or browser has been closed',
            'Call log:',
            '  - attempting click action',
            '  -   performing click action',
        ].join('\n'));
        expect(classifyClickFailure(hardError)).toBe('fatal');
    });

    test('strict-mode violations are fatal, not retried', () => {
        const strict = new Error(
            'locator.click: Error: strict mode violation: locator(\'button\') resolved to 2 elements',
        );
        expect(classifyClickFailure(strict)).toBe('fatal');
    });

    test('non-Error values are fatal', () => {
        expect(classifyClickFailure('boom')).toBe('fatal');
    });

    test('classification is by error class, not by a "Timeout Nms exceeded" substring', () => {
        // A non-timeout error whose text merely mentions a timeout must not be
        // treated as a driver timeout — the old message-sniffing shape did.
        const impostor = new Error([
            'locator.click: Error: Timeout 5000ms exceeded was reported by the app under test',
            'Call log:',
            '  -   performing click action',
        ].join('\n'));
        expect(classifyClickFailure(impostor)).toBe('fatal');

        const real = new errors.TimeoutError('locator.click: some wording the driver may change\n  -   performing click action');
        expect(classifyClickFailure(real)).toBe('input-may-have-fired');
        expect(isTimeoutError(real)).toBe(true);
        expect(isTimeoutError(impostor)).toBe(false);
    });
});
