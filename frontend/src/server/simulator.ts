// Background queue simulator — runs server-side so multiple browser
// sessions see the same live token progression.
//
// Every 25 s, for each active doctor that still has patients waiting,
// there's a 60% chance we increment `currentToken`. The function
// `tick()` is shared with the cron-driven route handler for Vercel.

import { prisma } from '../lib/db';
import { emitQueueUpdate } from './queue-bus';

const TICK_MS = 25_000;
const ADVANCE_PROBABILITY = 0.6;

declare global {
    // eslint-disable-next-line no-var
    var __zenSimulatorInterval: NodeJS.Timeout | null | undefined;
}

export async function tick(): Promise<{ advanced: number }> {
    let advanced = 0;
    try {
        const doctors = await prisma.doctor.findMany({
            where: { available: true },
        });
        for (const doc of doctors) {
            if (doc.currentToken >= doc.totalTokens) continue;
            if (Math.random() > ADVANCE_PROBABILITY) continue;
            // Re-check + atomic update in one transaction. Capture the
            // post-update value so the broadcast matches reality.
            const newToken = await prisma.$transaction(async (tx) => {
                const fresh = await tx.doctor.findUnique({ where: { id: doc.id } });
                if (!fresh || !fresh.available) return null;
                if (fresh.currentToken >= fresh.totalTokens) return null;
                const updated = await tx.doctor.update({
                    where: { id: doc.id },
                    data: { currentToken: { increment: 1 } },
                });
                return updated.currentToken;
            });
            if (newToken !== null) {
                advanced += 1;
                emitQueueUpdate({ doctorId: doc.id, newCurrentToken: newToken });
            }
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[simulator] tick failed:', err);
    }
    return { advanced };
}

export function startQueueSimulator(): void {
    if (global.__zenSimulatorInterval) return;
    global.__zenSimulatorInterval = setInterval(() => {
        void tick();
    }, TICK_MS);
    // eslint-disable-next-line no-console
    console.log(`[simulator] started, tick every ${TICK_MS} ms`);
}

export function stopQueueSimulator(): void {
    if (global.__zenSimulatorInterval) {
        clearInterval(global.__zenSimulatorInterval);
        global.__zenSimulatorInterval = null;
    }
}
