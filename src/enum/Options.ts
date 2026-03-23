import { Locator } from '@playwright/test';

/**
 * Defines the strategy for selecting an option from a dropdown element.
 */
export enum DropdownSelectType {
    /** Selects a completely random, non-disabled option with a valid value. */
    RANDOM = 'random',
    /** Selects an option based on its zero-based index in the dropdown. */
    INDEX = 'index',
    /** Selects an option based on its exact 'value' attribute. */
    VALUE = 'value'
}

/**
 * Configuration options for the `selectDropdown` method.
 */
export interface DropdownSelectOptions {
    /** The selection strategy to use. Defaults to RANDOM. */
    type?: DropdownSelectType;
    /** The specific value attribute to select (Required if type is VALUE). */
    value?: string;
    /** The index of the option to select (Required if type is INDEX). */
    index?: number;
}

/**
 * Configuration options for the `text` verification method.
 */
export interface TextVerifyOptions {
    /** If true, asserts that the element has text content, ignoring 'expectedText' */
    notEmpty?: boolean;
}

/**
 * Configuration options for the `count` verification method.
 */
export interface CountVerifyOptions {
    /** Asserts that the element count exactly matches this value */
    exactly?: number;
    /** Asserts that the element count is strictly greater than this value */
    greaterThan?: number;
    /** Asserts that the element count is strictly less than this value */
    lessThan?: number;
}

/**
 * Configuration options for the `dragAndDrop` method.
 * You must provide either a `targetLocator` OR both `xOffset` and `yOffset`.
 */
export interface DragAndDropOptions {
    /** The destination element to drop the dragged element onto. */
    target?: Locator;
    /** The horizontal offset from the center of the element (positive moves right). */
    xOffset?: number;
    /** The vertical offset from the center of the element (positive moves down). */
    yOffset?: number;
}

/**
 * Options for operating on a specific element within a list (e.g. a table row, list item, or card).
 *
 * The element is identified by matching its visible text or an HTML attribute.
 * An optional child target can drill into a sub-element within the matched element.
 *
 * @example
 * // Find row by text, verify its child cell's text
 * { text: 'Name', child: 'td:nth-child(2)', expectedText: 'John' }
 *
 * @example
 * // Find row by attribute, verify an attribute on it
 * { attribute: { name: 'data-id', value: '5' }, expected: { name: 'class', value: 'active' } }
 *
 * @example
 * // Find row by text, extract an attribute from a child via page-repo reference
 * { text: 'Name', child: { pageName: 'FormsPage', elementName: 'valueLink' }, extractAttribute: 'href' }
 */
export interface ListedElementOptions {
    /** Match the listed element by its visible text content. */
    text?: string;
    /** Match the listed element by an HTML attribute name-value pair. */
    attribute?: { name: string; value: string };
    /** Target a child within the matched element — a CSS selector string or a page-repository reference. */
    child?: string | { pageName: string; elementName: string };
    /** Assert that the resolved element's text matches this value. Used by `verifyListedElement`. */
    expectedText?: string;
    /** Assert that the resolved element has this attribute name-value pair. Used by `verifyListedElement`. */
    expected?: { name: string; value: string };
    /** Extract a specific attribute value instead of text content. Used by `getListedElementData`. */
    extractAttribute?: string;
}