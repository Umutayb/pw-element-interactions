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

/**
 * Describes a value for a single field in a `fillForm` call.
 * Use a plain string for text inputs, or a `DropdownSelectOptions` object for `<select>` elements.
 */
export type FillFormValue = string | DropdownSelectOptions;

/**
 * Options for the `getAll` bulk-extraction method.
 *
 * @example
 * // Get all name-column texts from table rows
 * { child: 'td:nth-child(2)' }
 *
 * @example
 * // Get all href attributes from links inside list items
 * { child: 'a', extractAttribute: 'href' }
 */
export interface GetAllOptions {
    /** Drill into a child element within each matched element before extracting. */
    child?: string | { pageName: string; elementName: string };
    /** Extract a specific attribute value instead of text content. */
    extractAttribute?: string;
}

/**
 * Options for the `screenshot` method.
 */
export interface ScreenshotOptions {
    /** Capture the full scrollable page instead of just the viewport. Only applies to page-level screenshots. */
    fullPage?: boolean;
    /** File path to save the screenshot to. If omitted, returns the image buffer without saving. */
    path?: string;
}

// ─── Email Types ─────────────────────────────────────────────────────────────

/**
 * Defines the type of filter to apply when searching for emails.
 */
export enum EmailFilterType {
    /** Filter by email subject. */
    SUBJECT = 'subject',
    /** Filter by sender address. */
    FROM = 'from',
    /** Filter by recipient address. */
    TO = 'to',
    /** Filter by email body content (HTML or plain text). */
    CONTENT = 'content',
    /** Filter to only include emails received after a given date. Value must be a Date object. */
    SINCE = 'since'
}

/**
 * A single email search filter. Combine multiple filters in an array
 * to narrow down the search.
 *
 * @example
 * { type: EmailFilterType.SUBJECT, value: 'Your OTP' }
 * { type: EmailFilterType.FROM, value: 'noreply@example.com' }
 * { type: EmailFilterType.SINCE, value: new Date('2025-01-01') }
 */
export interface EmailFilter {
    /** The filter type to apply. */
    type: EmailFilterType;
    /** The value to filter by. Use a string for SUBJECT/FROM/TO, or a Date for SINCE. */
    value: string | Date;
}

/**
 * SMTP and IMAP credentials for the email sub-API.
 */
export interface EmailCredentials {
    /** SMTP sender email address. */
    senderEmail: string;
    /** SMTP sender password or app password. */
    senderPassword: string;
    /** SMTP host (e.g. 'smtp-relay.sendinblue.com'). */
    senderSmtpHost: string;
    /** SMTP port. Defaults to 587. */
    senderSmtpPort?: number;
    /** IMAP receiver email address. */
    receiverEmail: string;
    /** IMAP receiver password or app password. */
    receiverPassword: string;
    /** IMAP host. Defaults to 'imap.gmail.com'. */
    receiverImapHost?: string;
    /** IMAP port. Defaults to 993. */
    receiverImapPort?: number;
}

/**
 * Options for sending an email.
 * Provide `text` for plain-text, `html` for inline HTML, or `htmlFile` for an HTML template file.
 */
export interface EmailSendOptions {
    /** Recipient email address. */
    to: string;
    /** Email subject line. */
    subject: string;
    /** Plain-text body. Used when neither `html` nor `htmlFile` is provided. */
    text?: string;
    /** Inline HTML body. Takes precedence over `text`. */
    html?: string;
    /** Path to an HTML file to use as the email body. Takes precedence over `html` and `text`. */
    htmlFile?: string;
}

/**
 * Options for receiving (searching and downloading) an email via IMAP.
 *
 * @example
 * // Combine multiple filters to narrow the search
 * {
 *   filters: [
 *     { type: EmailFilterType.SUBJECT, value: 'Your OTP' },
 *     { type: EmailFilterType.FROM, value: 'noreply@example.com' },
 *     { type: EmailFilterType.SINCE, value: new Date('2025-01-01') }
 *   ]
 * }
 */
export interface EmailReceiveOptions {
    /** Array of filters to apply when searching for emails. All filters are combined (AND logic). */
    filters: EmailFilter[];
    /** IMAP folder to search. Defaults to 'INBOX'. */
    folder?: string;
    /** How long to poll for a matching email (ms). Defaults to 30000. */
    waitTimeout?: number;
    /** Interval between poll attempts (ms). Defaults to 3000. */
    pollInterval?: number;
    /** Directory to save downloaded email HTML. Defaults to os.tmpdir()/pw-emails. */
    downloadDir?: string;
}

/**
 * Represents a received email after download.
 */
export interface ReceivedEmail {
    /** Local file path of the downloaded HTML. Open with `navigateTo('file://' + filePath)`. */
    filePath: string;
    /** Email subject. */
    subject: string;
    /** Sender address. */
    from: string;
    /** Date the email was sent. */
    date: Date;
    /** Raw HTML content (empty string if plain-text only). */
    html: string;
    /** Plain-text content. */
    text: string;
}