'use client';

// useQueueStream — opens an EventSource, listens for `queueUpdated`
// events, and falls back to a 10s poll on error. The previous version
// simply called `es.close()` on the first error, which would silently
// stop the page from ever auto-refreshing if the SSE connection was
// blocked by a proxy, a network blip, or a server restart. We now
// retry with exponential backoff (capped) and surface the
// disconnected state to the caller so the UI can show a banner.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Initial-snapshot shape mirrors what /api/queue/stream emits on connect.
export interface QueueSnapshot {
    ts: number;
    doctors: Array<{ id: string; currentToken: number; totalTokens: number }>;
}

export type QueueStreamState = 'connecting' | 'open' | 'disconnected' | 'unsupported';

export interface UseQueueStreamOptions {
    /** Called once after the initial snapshot arrives from the server. */
    onSnapshot?: (snapshot: QueueSnapshot) => void;
    /** Optional state-change hook so the UI can show a banner. */
    onStateChange?: (state: QueueStreamState) => void;
}

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export function useQueueStream(onUpdate: () => void, options: UseQueueStreamOptions = {}) {
    // The three callback refs are read by SSE event handlers. If we
    // refreshed them in a regular `useEffect`, the very first event
    // after mount could fire before the effect runs, reading the
    // previous render's callbacks (or `null`). `useLayoutEffect`
    // runs synchronously after DOM mutations and before paint, so
    // the refs are guaranteed to be current before any network or
    // event-loop callback can read them. All our consumers are
    // `'use client'` components, so the SSR warning does not apply.
    const onUpdateRef = useRef(onUpdate);
    const onSnapshotRef = useRef(options.onSnapshot);
    const onStateRef = useRef(options.onStateChange);
    useLayoutEffect(() => {
        onUpdateRef.current = onUpdate;
        onSnapshotRef.current = options.onSnapshot;
        onStateRef.current = options.onStateChange;
    }, [onUpdate, options.onSnapshot, options.onStateChange]);
    // SSR-safe initial state: we can't know EventSource support during
    // render on the server, so default to 'connecting' and let the
    // effect promote it to 'unsupported' if needed.
    const [state, setState] = useState<QueueStreamState>('connecting');

    useEffect(() => {
        // The support check itself doesn't need to mutate state. If
        // the environment can't host an EventSource, we can derive
        // that synchronously and skip the rest of the effect.
        if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
            // Defer the state promotion to a microtask so the effect
            // body stays free of synchronous setState calls.
            queueMicrotask(() => {
                setState((prev) => (prev === 'unsupported' ? prev : 'unsupported'));
                onStateRef.current?.('unsupported');
            });
            return;
        }

        let es: EventSource | null = null;
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        let cancelled = false;
        let backoff = BASE_BACKOFF_MS;

        const setAndEmit = (next: QueueStreamState) => {
            setState((prev) => (prev === next ? prev : next));
            onStateRef.current?.(next);
        };

        const open = () => {
            if (cancelled) return;
            setAndEmit('connecting');
            es = new EventSource('/api/queue/stream');

            const handler = () => onUpdateRef.current();
            const snapshotHandler = (e: MessageEvent) => {
                try {
                    const data = JSON.parse(e.data) as QueueSnapshot;
                    onSnapshotRef.current?.(data);
                } catch {
                    // ignore malformed payload
                }
            };
            const onOpen = () => {
                backoff = BASE_BACKOFF_MS; // reset on successful connect
                setAndEmit('open');
            };
            const onError = () => {
                // EventSource is closed automatically after an error, and
                // the `readyState` becomes CLOSED. We must tear down our
                // listeners before we close it, otherwise we leak.
                if (es) {
                    es.removeEventListener('queueUpdated', handler);
                    es.removeEventListener('snapshot', snapshotHandler);
                    es.removeEventListener('open', onOpen);
                    es.removeEventListener('error', onError);
                    try { es.close(); } catch { /* ignore */ }
                    es = null;
                }
                if (cancelled) return;
                setAndEmit('disconnected');
                // Exponential backoff with cap. Keeps the browser from
                // hammering the server when the SSE endpoint is down.
                retryTimer = setTimeout(() => {
                    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
                    open();
                }, backoff);
            };

            es.addEventListener('queueUpdated', handler);
            es.addEventListener('snapshot', snapshotHandler);
            es.addEventListener('open', onOpen);
            es.addEventListener('error', onError);
        };

        open();

        return () => {
            cancelled = true;
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
            if (es) {
                try { es.close(); } catch { /* ignore */ }
                es = null;
            }
        };
    }, []);

    return { state };
}
