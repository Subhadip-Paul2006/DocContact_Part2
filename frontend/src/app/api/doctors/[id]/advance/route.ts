// POST /api/doctors/:id/advance — testing helper that bumps the
// doctor's currentToken by one and emits a queue event so connected
// SSE clients see the change immediately.
//
// Authorization model:
//   1. Caller must be authenticated (`withAuth`).
//   2. The session's role must be `doctor`.
//   3. The chamber must be owned by the calling doctor
//      (`doctor.userId === user.id`); this prevents one doctor
//      (or any patient who somehow reaches the route) from
//      advancing / resetting *another* doctor's chamber.

import { ok, errorToResponse } from '@server/http';
import { withRole } from '@server/withAuth';
import { advanceQueue } from '@server/doctors/service';
import { emitQueueUpdate } from '@server/queue-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRole<{ params: Promise<{ id: string }> }>('doctor')(async (_req, ctx) => {
    try {
        const { id } = await ctx.params;
        const doctor = await advanceQueue(id, Number(ctx.user.id));
        emitQueueUpdate({ doctorId: doctor.id, newCurrentToken: doctor.currentToken });
        return ok({ doctor });
    } catch (err) {
        return errorToResponse(err);
    }
});
