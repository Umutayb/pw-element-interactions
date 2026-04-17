import { Locator } from '@playwright/test';

/**
 * Snapshot of an element's state at a single point in time.
 *
 * Passed to predicates in `steps.expect(el, page).toBe(predicate)` and
 * `steps.on(el, page).toBe(predicate)`. All fields are primitives or plain
 * data — no async methods, no Playwright types.
 */
export interface ElementSnapshot {
    readonly text: string;
    readonly value: string;
    readonly attributes: Readonly<Record<string, string>>;
    readonly visible: boolean;
    readonly enabled: boolean;
    readonly count: number;
}

/**
 * Minimal surface the matcher tree needs from its host (typically an
 * `ElementAction`). Decouples matchers from `ElementAction` so the matcher
 * tree can be constructed from either the fluent builder or a top-level
 * `Steps.expect()` call.
 */
export interface ExpectContext {
    readonly elementName: string;
    readonly pageName: string;
    readonly timeout: number;
    readonly conditionalVisible: boolean;
    readonly visibilityTimeout: number;
    resolveLocator(): Promise<Locator>;
    captureSnapshot(): Promise<ElementSnapshot>;
}

async function readCssProperty(locator: Locator, property: string): Promise<string> {
    return locator.evaluate(
        (el, prop) => window.getComputedStyle(el as Element).getPropertyValue(prop),
        property,
    );
}

function describeFailure(
    ctx: ExpectContext,
    field: string,
    verb: string,
    expected: unknown,
    actual: unknown,
    negated: boolean,
): string {
    const quote = (v: unknown) => (typeof v === 'string' ? `"${v}"` : String(v));
    const neg = negated ? 'not ' : '';
    return `expected ${ctx.pageName}.${ctx.elementName} ${field} ${neg}${verb} ${quote(expected)}, got ${quote(actual)}`;
}

abstract class BaseMatcher {
    constructor(protected ctx: ExpectContext, protected negated: boolean = false) {}

    protected async honorIfVisibleGate(): Promise<boolean> {
        if (!this.ctx.conditionalVisible) return true;
        try {
            const locator = await this.ctx.resolveLocator();
            await locator.waitFor({ state: 'visible', timeout: this.ctx.visibilityTimeout });
            return true;
        } catch {
            return false;
        }
    }

    protected async assertSnapshot(
        predicate: (snap: ElementSnapshot) => boolean,
        describe: (snap: ElementSnapshot, negated: boolean) => string,
    ): Promise<void> {
        if (!(await this.honorIfVisibleGate())) return;

        const deadline = Date.now() + this.ctx.timeout;
        const pollMs = 100;
        let lastSnapshot: ElementSnapshot | null = null;
        let lastError: unknown = null;

        while (Date.now() < deadline) {
            try {
                lastSnapshot = await this.ctx.captureSnapshot();
                if (predicate(lastSnapshot) !== this.negated) return;
            } catch (err) {
                lastError = err;
            }
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }

        if (!lastSnapshot) {
            const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown');
            throw new Error(
                `expect() failed on ${this.ctx.pageName}.${this.ctx.elementName}: could not resolve element within ${this.ctx.timeout}ms — ${reason}`,
            );
        }
        throw new Error(describe(lastSnapshot, this.negated));
    }

    protected async assertCustom(
        evaluate: () => Promise<boolean>,
        describe: (negated: boolean) => string,
    ): Promise<void> {
        if (!(await this.honorIfVisibleGate())) return;

        const deadline = Date.now() + this.ctx.timeout;
        const pollMs = 100;

        while (Date.now() < deadline) {
            try {
                if ((await evaluate()) !== this.negated) return;
            } catch {
                // swallow and retry
            }
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }

        throw new Error(describe(this.negated));
    }
}

/**
 * Shared string-matcher surface for any field whose value reduces to a string:
 * element text, input value, a specific attribute, a computed CSS property.
 * Subclasses supply a `label` (for error messages) and a `read` (how to fetch
 * the string — from the snapshot or a live read).
 */
abstract class StringMatcher extends BaseMatcher {
    protected abstract fieldLabel(): string;
    protected abstract read(snap: ElementSnapshot): string;

    async toBe(expected: string): Promise<void> {
        await this.assertSnapshot(
            s => this.read(s) === expected,
            (s, n) => describeFailure(this.ctx, this.fieldLabel(), 'to be', expected, this.read(s), n),
        );
    }

    async toContain(expected: string): Promise<void> {
        await this.assertSnapshot(
            s => this.read(s).includes(expected),
            (s, n) => describeFailure(this.ctx, this.fieldLabel(), 'to contain', expected, this.read(s), n),
        );
    }

    async toMatch(re: RegExp): Promise<void> {
        await this.assertSnapshot(
            s => re.test(this.read(s)),
            (s, n) => describeFailure(this.ctx, this.fieldLabel(), 'to match', re, this.read(s), n),
        );
    }

    async toStartWith(prefix: string): Promise<void> {
        await this.assertSnapshot(
            s => this.read(s).startsWith(prefix),
            (s, n) => describeFailure(this.ctx, this.fieldLabel(), 'to start with', prefix, this.read(s), n),
        );
    }

    async toEndWith(suffix: string): Promise<void> {
        await this.assertSnapshot(
            s => this.read(s).endsWith(suffix),
            (s, n) => describeFailure(this.ctx, this.fieldLabel(), 'to end with', suffix, this.read(s), n),
        );
    }
}

export class TextMatcher extends StringMatcher {
    get not(): TextMatcher {
        return new TextMatcher(this.ctx, !this.negated);
    }
    protected fieldLabel(): string { return 'text'; }
    protected read(snap: ElementSnapshot): string { return snap.text; }
}

export class ValueMatcher extends StringMatcher {
    get not(): ValueMatcher {
        return new ValueMatcher(this.ctx, !this.negated);
    }
    protected fieldLabel(): string { return 'value'; }
    protected read(snap: ElementSnapshot): string { return snap.value; }
}

export class AttributeMatcher extends StringMatcher {
    constructor(ctx: ExpectContext, private attrName: string, negated: boolean = false) {
        super(ctx, negated);
    }
    get not(): AttributeMatcher {
        return new AttributeMatcher(this.ctx, this.attrName, !this.negated);
    }
    protected fieldLabel(): string { return `attribute "${this.attrName}"`; }
    protected read(snap: ElementSnapshot): string { return snap.attributes[this.attrName] ?? ''; }
}

export class CountMatcher extends BaseMatcher {
    get not(): CountMatcher {
        return new CountMatcher(this.ctx, !this.negated);
    }

    async toBe(expected: number): Promise<void> {
        await this.assertSnapshot(
            s => s.count === expected,
            (s, n) => describeFailure(this.ctx, 'count', 'to be', expected, s.count, n),
        );
    }

    async toBeGreaterThan(n: number): Promise<void> {
        await this.assertSnapshot(
            s => s.count > n,
            (s, neg) => describeFailure(this.ctx, 'count', 'to be greater than', n, s.count, neg),
        );
    }

    async toBeLessThan(n: number): Promise<void> {
        await this.assertSnapshot(
            s => s.count < n,
            (s, neg) => describeFailure(this.ctx, 'count', 'to be less than', n, s.count, neg),
        );
    }

    async toBeGreaterThanOrEqual(n: number): Promise<void> {
        await this.assertSnapshot(
            s => s.count >= n,
            (s, neg) => describeFailure(this.ctx, 'count', 'to be greater than or equal to', n, s.count, neg),
        );
    }

    async toBeLessThanOrEqual(n: number): Promise<void> {
        await this.assertSnapshot(
            s => s.count <= n,
            (s, neg) => describeFailure(this.ctx, 'count', 'to be less than or equal to', n, s.count, neg),
        );
    }
}

type BooleanField = 'visible' | 'enabled';

export class BooleanMatcher extends BaseMatcher {
    constructor(ctx: ExpectContext, private field: BooleanField, negated: boolean = false) {
        super(ctx, negated);
    }

    get not(): BooleanMatcher {
        return new BooleanMatcher(this.ctx, this.field, !this.negated);
    }

    async toBe(expected: boolean): Promise<void> {
        await this.assertSnapshot(
            s => s[this.field] === expected,
            (s, n) => describeFailure(this.ctx, this.field, 'to be', expected, s[this.field], n),
        );
    }

    async toBeTrue(): Promise<void> { await this.toBe(true); }
    async toBeFalse(): Promise<void> { await this.toBe(false); }
}

export class AttributesMatcher extends BaseMatcher {
    get not(): AttributesMatcher {
        return new AttributesMatcher(this.ctx, !this.negated);
    }

    get(name: string): AttributeMatcher {
        return new AttributeMatcher(this.ctx, name, this.negated);
    }

    async toHaveKey(name: string): Promise<void> {
        await this.assertSnapshot(
            s => name in s.attributes,
            (s, n) =>
                `expected ${this.ctx.pageName}.${this.ctx.elementName} attributes ${n ? 'not ' : ''}to have key "${name}", present keys: [${Object.keys(s.attributes).join(', ')}]`,
        );
    }
}

export class CssMatcher extends BaseMatcher {
    constructor(ctx: ExpectContext, private property: string, negated: boolean = false) {
        super(ctx, negated);
    }

    get not(): CssMatcher {
        return new CssMatcher(this.ctx, this.property, !this.negated);
    }

    private async runCss(
        test: (value: string) => boolean,
        verb: string,
        expected: unknown,
    ): Promise<void> {
        let lastValue = '';
        await this.assertCustom(
            async () => {
                const locator = await this.ctx.resolveLocator();
                lastValue = await readCssProperty(locator, this.property);
                return test(lastValue);
            },
            n => describeFailure(this.ctx, `css "${this.property}"`, verb, expected, lastValue, n),
        );
    }

    async toBe(expected: string): Promise<void> {
        await this.runCss(v => v === expected, 'to be', expected);
    }

    async toContain(expected: string): Promise<void> {
        await this.runCss(v => v.includes(expected), 'to contain', expected);
    }

    async toMatch(re: RegExp): Promise<void> {
        await this.runCss(v => re.test(v), 'to match', re);
    }
}

/**
 * A chainable, awaitable predicate assertion. Built by `.toBe(predicate)` at
 * the builder or fluent level. Use `.throws(message)` to override the failure
 * message; `await` the result (or any `.then`-compatible context) to execute.
 */
export class PredicateAssertion implements PromiseLike<void> {
    constructor(
        private ctx: ExpectContext,
        private predicate: (el: ElementSnapshot) => boolean,
        private negated: boolean = false,
        private message?: string,
    ) {}

    /** Override the error message shown when the predicate fails. */
    throws(message: string): PredicateAssertion {
        return new PredicateAssertion(this.ctx, this.predicate, this.negated, message);
    }

    then<TResult1 = void, TResult2 = never>(
        onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined,
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private async execute(): Promise<void> {
        if (this.ctx.conditionalVisible) {
            try {
                const locator = await this.ctx.resolveLocator();
                await locator.waitFor({ state: 'visible', timeout: this.ctx.visibilityTimeout });
            } catch {
                return;
            }
        }

        const deadline = Date.now() + this.ctx.timeout;
        const pollMs = 100;
        let lastSnapshot: ElementSnapshot | null = null;
        let lastError: unknown = null;

        while (Date.now() < deadline) {
            try {
                lastSnapshot = await this.ctx.captureSnapshot();
                if (this.predicate(lastSnapshot) !== this.negated) return;
            } catch (err) {
                lastError = err;
            }
            await new Promise(resolve => setTimeout(resolve, pollMs));
        }

        const header = this.message
            ?? `expect().toBe(predicate) failed on ${this.ctx.pageName}.${this.ctx.elementName} after ${this.ctx.timeout}ms`;
        if (!lastSnapshot) {
            const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'unknown');
            throw new Error(`${header}\n  element could not be resolved: ${reason}`);
        }
        const snapshotJson = JSON.stringify(lastSnapshot, null, 2).replace(/^/gm, '    ');
        throw new Error(`${header}\n  snapshot at timeout:\n${snapshotJson}`);
    }
}

/**
 * Root of the matcher tree. Returned by `steps.expect(el, page)` and exposed
 * via `.not` on `ElementAction`. Every matcher reached from here carries the
 * negated flag inherited from this root.
 */
export class ExpectBuilder {
    constructor(private ctx: ExpectContext, private negated: boolean = false) {}

    get not(): ExpectBuilder {
        return new ExpectBuilder(this.ctx, !this.negated);
    }

    get text(): TextMatcher { return new TextMatcher(this.ctx, this.negated); }
    get value(): ValueMatcher { return new ValueMatcher(this.ctx, this.negated); }
    get count(): CountMatcher { return new CountMatcher(this.ctx, this.negated); }
    get visible(): BooleanMatcher { return new BooleanMatcher(this.ctx, 'visible', this.negated); }
    get enabled(): BooleanMatcher { return new BooleanMatcher(this.ctx, 'enabled', this.negated); }
    get attributes(): AttributesMatcher { return new AttributesMatcher(this.ctx, this.negated); }
    css(property: string): CssMatcher { return new CssMatcher(this.ctx, property, this.negated); }

    /**
     * Predicate escape hatch. Returns a chainable, awaitable assertion that
     * passes when the predicate returns `true` (or `false` if the builder is
     * negated). Use `.throws(message)` to override the failure message.
     *
     * @example
     * await steps.expect('price', 'ProductPage').toBe(el => parseFloat(el.text.slice(1)) > 10);
     * await steps.expect('price', 'ProductPage').toBe(el => el.visible && el.enabled)
     *   .throws('price must be visible and enabled');
     */
    toBe(predicate: (el: ElementSnapshot) => boolean): PredicateAssertion {
        return new PredicateAssertion(this.ctx, predicate, this.negated);
    }
}
