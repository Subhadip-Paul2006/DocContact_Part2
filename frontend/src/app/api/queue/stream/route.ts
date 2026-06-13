// GET /api/queue/stream — Server-Sent Events stream of queue updates.
// Auth-required. On connect, sends:
//   1) `ready` beacon
//   2) `snapshot` event with the current state of all available doctors
//   3) every subsequent `queueUpdated` event from the simulator bus
//
// Two hardening notes for this file:
//   * The bus listener is registered inside `start()` and **always**
//     removed — both on the `req.signal.abort` path and on the stream
//     `cancel` path. EventSource auto-reconnects on transient errors
//     would otherwise accumulate listeners on the global EventEmitter
//     and exhaust the (already-infinite) listener budget, eventually
//     causing warnings or process death.
//   * Same-origin check on the `Origin` / `Referer` header for the
//     SSE endpoint, mirroring the POST routes, so a cross-site page
//     can't subscribe to the live queue state.

import { NextResponse } from 'next/server';
import { getQueueBus, QUEUE_EVENT } from '@server/queue-bus';
import { auth } from '@lib/auth';
import { prisma } from '@lib/db';
import { assertSameOrigin } from '@server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const sameOriginError = assertSameOrigin(req);
    if (sameOriginError) return sameOriginError;

    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: { message: 'Authentication required.' } }, { status: 401 });
    }

    const bus = getQueueBus();
    const encoder = new TextEncoder();

    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let onUpdate: ((payload: unknown) => void) | null = null;

    const cleanup = () => {
        if (heartbeat) {
            clearInterval(heartbeat);
            heartbeat = null;
        }
        if (onUpdate) {
            bus.off(QUEUE_EVENT, onUpdate);
            onUpdate = null;
        }
    };

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const send = (event: string, data: unknown) => {
                try {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                } catch {
                    // controller may be closed
                }
            };

            // 1) ready beacon
            send('ready', { ts: Date.now() });

            // 2) initial snapshot — fetch current token state so the
            //    tracker renders the latest values without waiting for
            //    the next tick. We keep the payload small (id + token).
            try {
                const docs = await prisma.doctor.findMany({
                    where: { available: true },
                    select: { id: true, currentToken: true, totalTokens: true },
                });
                send('snapshot', { ts: Date.now(), doctors: docs });
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[queue/stream] snapshot fetch failed:', err);
                send('snapshot', { ts: Date.now(), doctors: [] });
            }

            // 3) subscribe to bus
            onUpdate = (payload: unknown) => send(QUEUE_EVENT, payload);
            bus.on(QUEUE_EVENT, onUpdate);

            // 4) keep-alive every 25s
            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: ping\n\n`));
                } catch {
                    // ignore
                }
            }, 25_000);

            // 5) tear down on client disconnect
            req.signal.addEventListener('abort', () => {
                cleanup();
                try {
                    controller.close();
                } catch {
                    // ignore
                }
            });
        },
        // EventSource `error` events (network blips, server restart)
        // call `cancel()`. Make sure the listener is detached so a
        // reconnect doesn't pile a second `onUpdate` on the bus.
        cancel() {
            cleanup();
        },
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
