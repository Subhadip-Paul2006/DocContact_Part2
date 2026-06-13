// GET  /api/doctors       — list + filter (treatment, city, search, activeOnly)
// POST /api/doctors       — apply (auth + role=doctor)

import { ok, fail, errorToResponse } from '@server/http';
import { withAuth, withRole } from '@server/withAuth';
import { listDoctors, applyAsDoctor } from '@server/doctors/service';
import { doctorApplySchema, doctorListQuerySchema } from '@schemas/doctor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const raw: Record<string, string> = {};
        url.searchParams.forEach((v, k) => {
            raw[k] = v;
        });
        const parsed = doctorListQuerySchema.safeParse(raw);
        if (!parsed.success) {
            return fail(400, parsed.error.issues[0]?.message ?? 'Invalid query.', 'VALIDATION');
        }
        const doctors = await listDoctors(parsed.data);
        return ok({ doctors });
    } catch (err) {
        return errorToResponse(err);
    }
}

export const POST = withRole('doctor')(async (req, { user }) => {
    const body = await req.json().catch(() => ({}));
    const parsed = doctorApplySchema.safeParse(body);
    if (!parsed.success) {
        return fail(400, parsed.error.issues[0]?.message ?? 'Invalid input.', 'VALIDATION');
    }
    // The session token stores `user.id` as the stringified numeric id —
    // we can use it directly with no DB round-trip.
    const userId = Number(user.id);
    if (!Number.isFinite(userId)) {
        return fail(400, 'Invalid session user.', 'VALIDATION');
    }
    const doctor = await applyAsDoctor(userId, parsed.data);
    return ok({ doctor });
});
