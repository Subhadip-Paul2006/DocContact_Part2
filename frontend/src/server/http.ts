// Tiny HTTP helpers for route handlers — uniform JSON envelope and
// shared error mapping. Keeps each route file to 5–15 lines.

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class HttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code?: string
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
    return NextResponse.json({ data }, init);
}

export function fail(status: number, message: string, code?: string): NextResponse {
    return NextResponse.json({ error: { message, code } }, { status });
}

/**
 * Origin/Referer check for state-changing routes.
 *
 * NextAuth's session cookie is `SameSite=lax` by default, which blocks
 * cross-site POSTs from a third-party form on a modern browser, but it
 * does NOT cover same-site sub-domains, same-origin pages rendered in
 * an `<iframe>`, or `fetch(..., { credentials: 'include' })` from a
 * subdomain XSS. To keep CSRF out of the picture we additionally
 * require the request's `Origin` (or `Referer` as a fallback) header
 * to match the host the route is being served from. Browser-driven
 * same-origin requests always carry one; cross-origin requests can't
 * forge one.
 *
 * Returns a 403 response when the check fails, or `null` when it
 * passes.
 */
export function assertSameOrigin(req: Request): NextResponse | null {
    if (process.env.NODE_ENV !== 'production') return null;
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

    const reqUrl = new URL(req.url);
    const expected = reqUrl.host;
    const headerOrigin = req.headers.get('origin');
    if (headerOrigin) {
        try {
            if (new URL(headerOrigin).host === expected) return null;
        } catch {
            // malformed origin -> fall through to referer
        }
        return fail(403, 'Cross-origin request blocked.', 'CSRF');
    }
    const referer = req.headers.get('referer');
    if (referer) {
        try {
            if (new URL(referer).host === expected) return null;
        } catch {
            // malformed referer -> fall through
        }
    }
    return fail(403, 'Cross-origin request blocked.', 'CSRF');
}

export function errorToResponse(err: unknown): NextResponse {
    if (err instanceof HttpError) {
        return fail(err.status, err.message, err.code);
    }
    if (err instanceof ZodError) {
        const first = err.issues[0];
        const msg = first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid input';
        return fail(400, msg, 'VALIDATION');
    }
    if (err && typeof err === 'object' && 'message' in err) {
        const message = String((err as { message: unknown }).message);
        // Common business errors from the booking flow.
        if (message.includes('full') || message.includes('not found')) {
            return fail(400, message, 'BUSINESS');
        }
        console.error('[route] unhandled error:', err);
        return fail(500, 'Internal server error', 'INTERNAL');
    }
    console.error('[route] non-object throw:', err);
    return fail(500, 'Internal server error', 'INTERNAL');
}
