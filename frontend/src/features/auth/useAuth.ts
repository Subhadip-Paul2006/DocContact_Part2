// Auth hook — wraps next-auth's useSession() and adapts the shape to
// the domain `User` type. Pages that need a guaranteed user should
// also gate at the server level via `requireUser` / `requireRole`.

'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Role, User } from '@/types/api';

interface AuthedUser extends User {
    id: number;
    role: Role;
}

interface CredentialsPayload {
    email: string;
    password: string;
}

interface SignupPayload extends CredentialsPayload {
    name: string;
    role: Role;
}

export function useAuth() {
    const { data, status, update } = useSession();

    const login = useCallback(async (email: string, password: string) => {
        const res = await signIn('credentials', { email, password, redirect: false });
        if (!res || res.error) {
            throw new ApiError('Email or password is incorrect.', 401);
        }
        await update();
        const me = await api<{ data: { user: AuthedUser | null } }>('/api/auth/me');
        if (!me.data.user) {
            throw new ApiError('Session could not be established.', 500);
        }
        return me.data.user;
    }, [update]);

    const signup = useCallback(async (name: string, email: string, password: string, role: Role) => {
        await api<{ data: { user: AuthedUser } }>('/api/auth/signup', {
            method: 'POST',
            body: { name, email, password, role } satisfies SignupPayload,
        });
        // Now perform a real credentials sign-in. This sets the session
        // cookie in the normal client → /api/auth/callback/credentials flow.
        const res = await signIn('credentials', { email, password, redirect: false });
        if (!res || res.error) {
            throw new ApiError('Account created but sign-in failed. Please log in manually.', 500);
        }
        await update();
        const me = await api<{ data: { user: AuthedUser | null } }>('/api/auth/me');
        return me.data.user!;
    }, [update]);

    const logout = useCallback(async () => {
        await signOut({ redirect: false });
        await update();
    }, [update]);

    return {
        user: (data?.user as AuthedUser | undefined) ?? null,
        ready: status !== 'loading',
        status,
        login,
        signup,
        logout,
    };
}
