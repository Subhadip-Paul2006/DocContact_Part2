'use client';

// useQueueStream — opens an EventSource, listens for `queueUpdated`
// events, and falls back to a 10s poll on error.

import { useEffect, useRef } from 'react';

// Initial-snapshot shape mirrors what /api/queue/stream emits on connect.
export interface QueueSnapshot {
    ts: number;
    doctors: Array<{ id: string; currentToken: number; totalTokens: number }>;
}

export interface UseQueueStreamOptions {
    /** Called once after the initial snapshot arrives from the server. */
    onSnapshot?: (snapshot: QueueSnapshot) => void;
}

export function useQueueStream(onUpdate: () => void, options: UseQueueStreamOptions = {}) {
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;
    const onSnapshotRef = useRef(options.onSnapshot);
    onSnapshotRef.current = options.onSnapshot;

    useEffect(() => {
        if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
        const es = new EventSource('/api/queue/stream');
        const handler = () => onUpdateRef.current();
        const snapshotHandler = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data) as QueueSnapshot;
                onSnapshotRef.current?.(data);
            } catch {
                // ignore malformed payload
            }
        };
        es.addEventListener('queueUpdated', handler);
        es.addEventListener('snapshot', snapshotHandler);
        es.onerror = () => {
            es.close();
        };
        return () => {
            es.removeEventListener('queueUpdated', handler);
            es.removeEventListener('snapshot', snapshotHandler);
            es.close();
        };
    }, []);
}
