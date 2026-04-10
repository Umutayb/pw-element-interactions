import { Page, Locator } from '@playwright/test';
import { Utils } from '../utils/ElementUtilities';
import { ScreenshotOptions } from '../enum/Options';
import { Element, WebElement } from '@civitas-cerebrum/element-repository';

type Target = Locator | Element;

function resolveLocator(target: Target): Locator {
    if ('_type' in target) {
        return (target as unknown as WebElement).locator;
    }
    return target as Locator;
}

export class Extractions {
    private ELEMENT_TIMEOUT : number;
    private utils: Utils;

    /**
     * Initializes the Extractions class.
     * @param page - The current Playwright Page object.
     * @param timeout - Optional override for the default element timeout.
     */
    constructor(private page: Page, timeout: number = 30000) {
        this.ELEMENT_TIMEOUT = timeout;
        this.utils = new Utils(this.ELEMENT_TIMEOUT);
    }

    /**
     * Safely retrieves and trims the text content of an element.
     * @param target - A Playwright Locator or Element pointing to the target element.
     * @returns The trimmed string, or an empty string if null.
     */
    async getText(target: Target): Promise<string | null> {
        const locator = resolveLocator(target);
        await this.utils.waitForState(locator, 'attached');
        const text = await locator.textContent({ timeout: this.ELEMENT_TIMEOUT });
        return text?.trim() ?? null;
    }

    /**
     * Retrieves the value of a specified attribute (e.g., 'href', 'aria-pressed').
     * @param target - A Playwright Locator or Element pointing to the target element.
     * @param attributeName - The name of the attribute to retrieve.
     * @returns The attribute value as a string, or null if it doesn't exist.
     */
    async getAttribute(target: Target, attributeName: string): Promise<string | null> {
        const locator = resolveLocator(target);
        await this.utils.waitForState(locator, 'attached');
        return await locator.getAttribute(attributeName, { timeout: this.ELEMENT_TIMEOUT });
    }

    /**
     * Retrieves the trimmed text content of every element matching the locator.
     * @param target - A Playwright Locator or Element pointing to the target elements.
     * @returns An array of trimmed text strings, one per matching element.
     */
    async getAllTexts(target: Target): Promise<string[]> {
        const locator = resolveLocator(target);
        const rawTexts = await locator.allTextContents();
        return rawTexts.map(t => t.trim());
    }

    /**
     * Retrieves the current value of an input, textarea, or select element.
     * Unlike `getText` which reads `textContent`, this reads the `value` property.
     * @param target - A Playwright Locator or Element pointing to the input element.
     * @returns The current value of the input.
     */
    async getInputValue(target: Target): Promise<string> {
        const locator = resolveLocator(target);
        await this.utils.waitForState(locator, 'attached');
        return await locator.inputValue({ timeout: this.ELEMENT_TIMEOUT });
    }

    /**
     * Returns the number of DOM elements matching the locator.
     * @param target - A Playwright Locator or Element pointing to the target elements.
     * @returns The count of matching elements.
     */
    async getCount(target: Target): Promise<number> {
        const locator = resolveLocator(target);
        return await locator.count();
    }

    /**
     * Retrieves a computed CSS property value from an element via `getComputedStyle`.
     * @param target - A Playwright Locator or Element pointing to the target element.
     * @param property - The CSS property name (e.g. `'color'`, `'font-size'`, `'display'`).
     * @returns The computed value of the CSS property as a string.
     */
    async getCssProperty(target: Target, property: string): Promise<string> {
        const locator = resolveLocator(target);
        await this.utils.waitForState(locator, 'attached');
        return await locator.evaluate(
            (el, prop) => window.getComputedStyle(el).getPropertyValue(prop),
            property
        );
    }

    /**
     * Captures a screenshot of the full page or a specific element.
     * @param target - If provided, screenshots only this element. If omitted, screenshots the full page.
     * @param options - Optional configuration: `fullPage` for scrollable capture, `path` to save to disk.
     * @returns The screenshot image as a Buffer.
     */
    async screenshot(target?: Target, options?: ScreenshotOptions): Promise<Buffer> {
        if (target) {
            const locator = resolveLocator(target);
            return await locator.screenshot({ path: options?.path }) as Buffer;
        }
        return await this.page.screenshot({
            fullPage: options?.fullPage,
            path: options?.path,
        }) as Buffer;
    }
}
