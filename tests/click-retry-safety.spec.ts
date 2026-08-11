import { test, expect } from './fixture/StepFixture';
import type { Page } from '@playwright/test';
import { Interactions, classifyClickFailure } from '../src/interactions/Interaction';
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
        const button = await pageWithCountingButton(page);

        // A one-shot handler blocks the main thread for 3s as soon as the
        // click's input arrives, so the click action cannot complete within
        // the 1.5s attempt budget — the attempt times out in the
        // "performing click action" phase AFTER the input was dispatched.
        // This is the deterministic equivalent of the CI race where the
        // actionability wait eats the 5s cap and input lands at the deadline.
        await page.evaluate(() => {
            document.getElementById('btn')!.addEventListener('click', () => {
                const end = Date.now() + 3000;
                while (Date.now() < end) { /* block the renderer */ }
            }, { once: true });
        });

        const interactions = new Interactions(page, 1500);

        // Must resolve (click treated as delivered), not throw and not re-click.
        await interactions.click(button);

        // Causal assertion: exactly ONE click reached the page. The old blind
        // retry delivered a second physical click here (count === 2).
        await expect.poll(() => page.evaluate(() => (window as unknown as { __clicks: number }).__clicks), {
            timeout: 10000,
        }).toBe(1);

        // The decision must be report-visible, mirroring interception-fallback.
        const note = testInfo.annotations.find(a => a.type === 'deadline-click');
        expect(note, 'expected a deadline-click annotation on the test').toBeTruthy();
        expect(note?.description).toContain('performing click action');
    });

    test('waiting-phase timeout: full-timeout retry is preserved and clicks exactly once', async ({ page }, testInfo) => {
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

    test('timeout still in an actionability waiting phase is safe-to-retry', () => {
        expect(classifyClickFailure(waitingPhaseTimeout())).toBe('safe-to-retry');
    });

    test('interception wins over performing click action (input was NOT dispatched)', () => {
        expect(classifyClickFailure(interceptionTimeout())).toBe('interception');
    });

    test('hard errors are never swallowed as a delivered click', () => {
        // Same call log shape, but not a timeout — e.g. the page closed
        // mid-action. Must stay on the retry path so the real error surfaces.
        const hardError = new Error([
            'locator.click: Target page, context or browser has been closed',
            'Call log:',
            '  - attempting click action',
            '  -   performing click action',
        ].join('\n'));
        expect(classifyClickFailure(hardError)).toBe('safe-to-retry');
    });

    test('non-Error values are safe-to-retry', () => {
        expect(classifyClickFailure('boom')).toBe('safe-to-retry');
    });
});
