// GET  /api/bookings — list current user's bookings (with live doctor data)
// POST /api/bookings — create a booking for the current user
//
// `withAuth` already wraps the inner handler in try/catch + `errorToResponse`,
// so we just throw or return and let the wrapper handle errors.

import { ok, fail, assertSameOrigin, errorToResponse } from '@server/http';
import { withAuth } from '@server/withAuth';
import { createBooking, listBookingsForUser } from '@server/bookings/service';
import { createBookingSchema } from '@schemas/booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (_req, { user }) => {
    const bookings = await listBookingsForUser(Number(user.id));
    return ok({ bookings });
});

export const POST = withAuth(async (req, { user }) => {
    const csrf = assertSameOrigin(req);
    if (csrf) return csrf;
    let body: unknown = {};
    try {
        body = await req.json();
    } catch (err) {
        return errorToResponse(err);
    }
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
        return fail(400, parsed.error.issues[0]?.message ?? 'Invalid input.', 'VALIDATION');
    }
    const booking = await createBooking(Number(user.id), parsed.data);
    return ok({ booking });
});
