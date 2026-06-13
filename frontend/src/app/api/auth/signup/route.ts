// POST /api/auth/signup
// Creates a new user. We do NOT call NextAuth's `signIn` from inside this
// route — calling `signIn` server-side from a route handler is unreliable
// (cookie context doesn't always propagate), and silently swallowing the
// error would mask real failures. Instead, we return success and the client
// (`useAuth.signup`) performs a normal credentials sign-in afterwards.

import { ok, fail, errorToResponse } from '@server/http';
import { createUser } from '@server/auth/service';
import { signupSchema } from '@schemas/user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const parsed = signupSchema.safeParse(body);
        if (!parsed.success) {
            return fail(400, parsed.error.issues[0]?.message ?? 'Invalid input.', 'VALIDATION');
        }
        const user = await createUser(parsed.data);
        return ok({ user });
    } catch (err) {
        return errorToResponse(err);
    }
}
