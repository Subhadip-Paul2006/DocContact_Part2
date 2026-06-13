// POST /api/doctors/:id/reset — testing helper that resets the
// doctor's currentToken to 0 and emits a queue event.
//
// See `advance/route.ts` for the full authorization rationale. In
// short: this is a destructive privileged action and is gated to
// the chamber's owning doctor.

import { ok, errorToResponse } from '@server/http';
import { withRole } from '@server/withAuth';
import { resetQueue } from '@server/doctors/service';
import { emitQueueUpdate } from '@server/queue-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRole<{ params: Promise<{ id: string }> }>('doctor')(async (_req, ctx) => {
    try {
        const { id } = await ctx.params;
        const doctor = await resetQueue(id, Number(ctx.user.id));
        emitQueueUpdate({ doctorId: doctor.id, newCurrentToken: 0 });
        return ok({ doctor });
    } catch (err) {
        return errorToResponse(err);
    }
});
