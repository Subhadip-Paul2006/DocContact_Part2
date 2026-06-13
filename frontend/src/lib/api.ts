// Tiny client-side fetch wrapper — matches the API envelope of `ok()`
// (returns `{ data: { ... } }`) and `fail()` (returns `{ error: { ... } }`).

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

interface ApiOptions extends Omit<RequestInit, 'body' | 'signal'> {
    body?: unknown;
    /** Abort signal to cancel the in-flight request. Forwarded to `fetch`. */
    signal?: AbortSignal;
}

// Cap response bodies at 1 MB. A misbehaving (or hostile) backend that
// returns 10 MB of JSON would otherwise hang the tab and OOM the JS
// heap. 1 MB is comfortably above the largest legitimate payload this
// app returns (the doctor list with images is well under 200 KB).
const MAX_RESPONSE_BYTES = 1 * 1024 * 1024;

export async function api<T>(path: string, { body, headers, signal, ...rest }: ApiOptions = {}): Promise<T> {
    const init: RequestInit = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(headers || {}),
        },
        ...(signal ? { signal } : {}),
        ...rest,
    };
    if (body !== undefined) {
        init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const res = await fetch(path, init);
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
        // Avoid `res.text()` on a body we already know is too large —
        // gives the network stack a chance to drain the socket.
        try { res.body?.cancel(); } catch { /* ignore */ }
        throw new ApiError(`Response too large (${contentLength} bytes).`, 413);
    }
    const text = await res.text();
    if (text.length > MAX_RESPONSE_BYTES) {
        throw new ApiError(`Response too large (${text.length} bytes).`, 413);
    }
    let parsed: unknown = null;
    if (text) {
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = text;
        }
    }
    if (!res.ok) {
        const message =
            parsed && typeof parsed === 'object' && 'error' in parsed
                ? extractErrorMessage((parsed as { error: unknown }).error) ?? res.statusText
                : res.statusText || `Request failed (${res.status})`;
        throw new ApiError(message, res.status);
    }
    return parsed as T;
}

function extractErrorMessage(error: unknown): string | null {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
        const m = (error as { message: unknown }).message;
        if (typeof m === 'string') return m;
    }
    return null;
}
