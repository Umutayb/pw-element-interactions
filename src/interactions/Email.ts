import * as nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createLogger } from '../logger/Logger';
import { EmailSendOptions, EmailReceiveOptions, EmailCredentials, ReceivedEmail, EmailFilterType, EmailFilter } from '../enum/Options';

const log = createLogger('email');

/**
 * Handles SMTP email sending and IMAP email receiving for test automation.
 *
 * Supports sending plain-text or HTML emails, receiving and searching inbox
 * messages via IMAP, and downloading email HTML to disk so it can be opened
 * in a browser with `navigateTo('file://' + path)`.
 */
export class Email {

    private smtpTransport: nodemailer.Transporter | null = null;

    constructor(private credentials: EmailCredentials) {}

    // ─── SMTP ────────────────────────────────────────────────────────────

    /**
     * Sends an email. Supports:
     *  - Plain text: `{ subject, text }`
     *  - Inline HTML: `{ subject, html: '<h1>Hello</h1>' }`
     *  - HTML file: `{ subject, htmlFile: 'emails/report.html' }`
     */
    async send(options: EmailSendOptions): Promise<void> {
        const transport = this.getSmtpTransport();
        const { to, subject, text, html, htmlFile } = options;

        let htmlContent = html;
        if (htmlFile) {
            const resolvedPath = path.resolve(htmlFile);
            if (!fs.existsSync(resolvedPath)) {
                throw new Error(`HTML file not found: ${resolvedPath}`);
            }
            htmlContent = fs.readFileSync(resolvedPath, 'utf-8');
            log('Loaded HTML email body from %s (%d bytes)', resolvedPath, htmlContent.length);
        }

        const mailOptions: nodemailer.SendMailOptions = {
            from: this.credentials.senderEmail,
            to,
            subject,
            ...(htmlContent ? { html: htmlContent } : { text: text ?? '' })
        };

        const info = await transport.sendMail(mailOptions);
        log('Email sent to %s — messageId: %s', to, info.messageId);
    }

    // ─── IMAP ────────────────────────────────────────────────────────────

    /**
     * Searches the inbox for the most recent email matching the given filters,
     * downloads its HTML content, and returns a `ReceivedEmail`.
     *
     * ```ts
     * const email = await steps.email.receive({
     *   filters: [{ type: EmailFilterType.SUBJECT, value: 'Your OTP' }]
     * });
     * await steps.navigateTo('file://' + email.filePath);
     * ```
     */
    async receive(options: EmailReceiveOptions): Promise<ReceivedEmail> {
        const { filters, folder, waitTimeout, pollInterval, downloadDir } = options;
        this.validateFilters(filters);

        const timeout = waitTimeout ?? 30000;
        const interval = pollInterval ?? 3000;
        const mailbox = folder ?? 'INBOX';
        const deadline = Date.now() + timeout;

        const client = this.createImapClient();

        try {
            await client.connect();
            this.logImapConnection();

            while (Date.now() < deadline) {
                await client.mailboxOpen(mailbox);
                const candidates = await this.fetchCandidates(client, filters, downloadDir);

                const result = this.applyFilters(candidates, filters);
                if (result.length > 0) {
                    await client.logout();
                    return result[result.length - 1];
                }

                log('No matching email found yet, retrying in %dms...', interval);
                await new Promise(resolve => setTimeout(resolve, interval));
            }

            await client.logout();
            throw new Error(`No email matching criteria found within ${timeout}ms. Searched in "${mailbox}" for: ${this.formatFilterSummary(filters)}`);
        } catch (error) {
            try { await client.logout(); } catch { /* already disconnected */ }
            throw error;
        }
    }

    /**
     * Searches the inbox for all emails matching the given filters,
     * downloads their HTML content, and returns an array of `ReceivedEmail`.
     *
     * ```ts
     * const emails = await steps.email.receiveAll({
     *   filters: [
     *     { type: EmailFilterType.FROM, value: 'noreply@example.com' },
     *     { type: EmailFilterType.SINCE, value: new Date('2025-01-01') }
     *   ]
     * });
     * ```
     */
    async receiveAll(options: EmailReceiveOptions): Promise<ReceivedEmail[]> {
        const { filters, folder, waitTimeout, pollInterval, downloadDir } = options;
        this.validateFilters(filters);

        const timeout = waitTimeout ?? 30000;
        const interval = pollInterval ?? 3000;
        const mailbox = folder ?? 'INBOX';
        const deadline = Date.now() + timeout;

        const client = this.createImapClient();

        try {
            await client.connect();
            this.logImapConnection();

            while (Date.now() < deadline) {
                await client.mailboxOpen(mailbox);
                const candidates = await this.fetchCandidates(client, filters, downloadDir);

                const results = this.applyFilters(candidates, filters);
                if (results.length > 0) {
                    log('Found %d matching email(s)', results.length);
                    await client.logout();
                    return results;
                }

                log('No matching emails found yet, retrying in %dms...', interval);
                await new Promise(resolve => setTimeout(resolve, interval));
            }

            await client.logout();
            throw new Error(`No emails matching criteria found within ${timeout}ms. Searched in "${mailbox}" for: ${this.formatFilterSummary(filters)}`);
        } catch (error) {
            try { await client.logout(); } catch { /* already disconnected */ }
            throw error;
        }
    }

    /**
     * Deletes emails from the inbox matching the given filters.
     * If no filters are provided, deletes all emails in the folder.
     *
     * ```ts
     * // Delete all emails from a specific sender
     * await steps.email.clean({
     *   filters: [{ type: EmailFilterType.FROM, value: 'noreply@example.com' }]
     * });
     *
     * // Clean entire inbox
     * await steps.email.clean();
     * ```
     */
    async clean(options?: { filters?: EmailReceiveOptions['filters']; folder?: string }): Promise<number> {
        const filters = options?.filters;
        const mailbox = options?.folder ?? 'INBOX';

        const client = this.createImapClient();

        try {
            await client.connect();
            this.logImapConnection();
            await client.mailboxOpen(mailbox);

            const searchCriteria = filters && filters.length > 0
                ? this.buildSearchCriteria(filters)
                : { all: true };

            const uids: number[] = [];
            for await (const msg of client.fetch({ ...searchCriteria }, { uid: true })) {
                uids.push(msg.uid);
            }

            if (uids.length > 0) {
                await client.messageDelete(uids, { uid: true });
                log('Deleted %d email(s) from "%s"', uids.length, mailbox);
            } else {
                log('No emails to delete in "%s"', mailbox);
            }

            await client.logout();
            return uids.length;
        } catch (error) {
            try { await client.logout(); } catch { /* already disconnected */ }
            throw error;
        }
    }

    // ─── Private helpers ─────────────────────────────────────────────────

    private validateFilters(filters: EmailReceiveOptions['filters']): void {
        if (!filters || filters.length === 0) {
            throw new Error('At least one email filter is required. Use EmailFilterType to specify filter criteria.');
        }
    }

    private createImapClient(): ImapFlow {
        return new ImapFlow({
            host: this.credentials.receiverImapHost ?? 'imap.gmail.com',
            port: this.credentials.receiverImapPort ?? 993,
            secure: true,
            auth: {
                user: this.credentials.receiverEmail,
                pass: this.credentials.receiverPassword
            },
            logger: false
        });
    }

    private logImapConnection(): void {
        log('IMAP connected to %s as %s', this.credentials.receiverImapHost ?? 'imap.gmail.com', this.credentials.receiverEmail);
    }

    private buildSearchCriteria(filters: EmailFilter[]): Record<string, any> {
        const criteria: Record<string, any> = {};
        for (const filter of filters) {
            switch (filter.type) {
                case EmailFilterType.SUBJECT:
                    criteria.subject = filter.value;
                    break;
                case EmailFilterType.FROM:
                    criteria.from = filter.value;
                    break;
                case EmailFilterType.TO:
                    criteria.to = filter.value;
                    break;
                case EmailFilterType.CONTENT:
                    criteria.body = filter.value;
                    break;
                case EmailFilterType.SINCE:
                    criteria.since = filter.value;
                    break;
                default:
                    throw new Error(`Unknown email filter type: ${(filter as any).type}`);
            }
        }
        return criteria;
    }

    private async fetchCandidates(client: ImapFlow, filters: EmailFilter[], downloadDir?: string): Promise<ReceivedEmail[]> {
        const searchCriteria = this.buildSearchCriteria(filters);
        const candidates: ReceivedEmail[] = [];
        for await (const msg of client.fetch({ ...searchCriteria }, { source: true, envelope: true })) {
            candidates.push(this.parseMessage(msg, downloadDir));
        }
        return candidates;
    }

    /**
     * Applies two-phase client-side filtering:
     * 1. Exact match on all string filters (subject, from, to, content)
     * 2. If no exact matches, falls back to partial case-insensitive contains with a warning
     *
     * Date (SINCE) filters are handled server-side by IMAP and not re-checked here.
     */
    applyFilters(candidates: ReceivedEmail[], filters: EmailFilter[]): ReceivedEmail[] {
        const stringFilters = filters.filter(f => f.type !== EmailFilterType.SINCE);
        if (stringFilters.length === 0) return candidates;

        // Phase 1: exact match
        const exactMatches = candidates.filter(email => this.matchesAllFilters(email, stringFilters, true));
        if (exactMatches.length > 0) return exactMatches;

        // Phase 2: partial case-insensitive match
        const partialMatches = candidates.filter(email => this.matchesAllFilters(email, stringFilters, false));
        if (partialMatches.length > 0) {
            log('⚠️  No exact match found — falling back to partial case-insensitive match for: %s', this.formatFilterSummary(stringFilters));
        }
        return partialMatches;
    }

    private matchesAllFilters(email: ReceivedEmail, filters: EmailFilter[], exact: boolean): boolean {
        return filters.every(filter => {
            const filterValue = filter.value as string;
            const fieldValue = this.getEmailField(email, filter.type);
            if (exact) {
                return fieldValue === filterValue;
            }
            return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
        });
    }

    private getEmailField(email: ReceivedEmail, filterType: EmailFilterType): string {
        switch (filterType) {
            case EmailFilterType.SUBJECT: return email.subject;
            case EmailFilterType.FROM: return email.from;
            case EmailFilterType.TO: return ''; // TO is in the envelope, not in ReceivedEmail — matched server-side
            case EmailFilterType.CONTENT: return email.html || email.text;
            default: return '';
        }
    }

    private formatFilterSummary(filters: EmailReceiveOptions['filters']): string {
        return filters.map(f => `${f.type}: ${f.value instanceof Date ? f.value.toISOString() : f.value}`).join(', ');
    }

    private parseMessage(msg: any, downloadDir?: string): ReceivedEmail {
        const source = msg.source?.toString('utf-8') ?? '';
        const envelope = msg.envelope;

        const htmlBody = this.extractHtmlFromSource(source);
        const textBody = this.extractTextFromSource(source);

        const outputDir = downloadDir ?? path.join(os.tmpdir(), 'pw-emails');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const sanitizedSubject = (envelope?.subject ?? 'email')
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .substring(0, 50);
        const fileName = `${sanitizedSubject}-${Date.now()}.html`;
        const filePath = path.join(outputDir, fileName);

        const content = htmlBody || `<pre>${textBody}</pre>`;
        fs.writeFileSync(filePath, content, 'utf-8');
        log('Email downloaded to %s', filePath);

        return {
            filePath,
            subject: envelope?.subject ?? '',
            from: envelope?.from?.[0]?.address ?? '',
            date: envelope?.date ?? new Date(),
            html: htmlBody,
            text: textBody
        };
    }

    private getSmtpTransport(): nodemailer.Transporter {
        if (!this.smtpTransport) {
            this.smtpTransport = nodemailer.createTransport({
                host: this.credentials.senderSmtpHost,
                port: this.credentials.senderSmtpPort ?? 587,
                secure: this.credentials.senderSmtpPort === 465,
                auth: {
                    user: this.credentials.senderEmail,
                    pass: this.credentials.senderPassword
                }
            });
        }
        return this.smtpTransport;
    }

    /**
     * Extracts the HTML body from a raw MIME source.
     */
    private extractHtmlFromSource(source: string): string {
        // Look for text/html content-type boundary
        const htmlMatch = source.match(
            /Content-Type:\s*text\/html[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\.\r?\n|$)/i
        );
        if (htmlMatch) {
            let content = htmlMatch[1];
            // Handle base64 encoding
            if (source.match(/Content-Transfer-Encoding:\s*base64/i)) {
                try {
                    content = Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf-8');
                } catch { /* not base64, use as-is */ }
            }
            // Handle quoted-printable encoding
            if (source.match(/Content-Transfer-Encoding:\s*quoted-printable/i)) {
                content = content
                    .replace(/=\r?\n/g, '')
                    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            }
            return content;
        }
        return '';
    }

    /**
     * Extracts the plain-text body from a raw MIME source.
     */
    private extractTextFromSource(source: string): string {
        const textMatch = source.match(
            /Content-Type:\s*text\/plain[\s\S]*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n\.\r?\n|$)/i
        );
        if (textMatch) {
            let content = textMatch[1];
            if (source.match(/Content-Transfer-Encoding:\s*base64/i)) {
                try {
                    content = Buffer.from(content.replace(/\s/g, ''), 'base64').toString('utf-8');
                } catch { /* not base64, use as-is */ }
            }
            return content;
        }
        return '';
    }
}
