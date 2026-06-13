// Auth service — user creation and lookup, isolated from the route
// handlers so the same code can be used in API routes and (future)
// server actions.

import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import type { SignupInput } from '../../schemas/user';

export interface AuthedUser {
    id: number;
    email: string;
    name: string;
    role: 'patient' | 'doctor';
    createdAt: string;
}

export async function createUser(input: SignupInput): Promise<AuthedUser> {
    const existing = await prisma.user.findUnique({
        where: { email: input.email },
    });
    if (existing) {
        throw new HttpError(409, 'Email already registered.', 'EMAIL_TAKEN');
    }
    const passwordHash = bcrypt.hashSync(input.password, 10);
    try {
        const created = await prisma.user.create({
            data: {
                email: input.email,
                name: input.name,
                passwordHash,
                role: input.role,
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        return toAuthedUser(created);
    } catch (err) {
        // Race-window: another request created the same email between our
        // pre-check and the insert. Prisma raises P2002 (unique violation).
        // Map it to the same 409 the pre-check uses so the client always
        // gets a friendly "already exists" message instead of a 500.
        if (isUniqueEmailError(err)) {
            throw new HttpError(409, 'Email already registered.', 'EMAIL_TAKEN');
        }
        throw err;
    }
}

function isUniqueEmailError(err: unknown): boolean {
    if (!err || typeof err !== 'object') return false;
    const e = err as { code?: unknown; meta?: { target?: unknown } };
    if (e.code !== 'P2002') return false;
    const target = e.meta?.target;
    if (Array.isArray(target)) return target.includes('email');
    if (typeof target === 'string') return target === 'email' || target === 'users_email_key';
    return true;
}

export async function findUserById(id: string | number): Promise<AuthedUser | null> {
    const user = await prisma.user.findUnique({
        where: { id: Number(id) },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return user ? toAuthedUser(user) : null;
}

export async function findUserByEmailWithHash(
    email: string
): Promise<{ id: number; passwordHash: string; role: 'patient' | 'doctor' } | null> {
    const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true, passwordHash: true, role: true },
    });
    return user
        ? {
              id: user.id,
              passwordHash: user.passwordHash,
              role: user.role as 'patient' | 'doctor',
          }
        : null;
}

export function verifyPassword(plain: string, hash: string): boolean {
    return bcrypt.compareSync(plain, hash);
}

function toAuthedUser(u: {
    id: number;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
}): AuthedUser {
    return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'patient' | 'doctor',
        createdAt: u.createdAt.toISOString(),
    };
}
