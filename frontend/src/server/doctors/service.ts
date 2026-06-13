// Doctor service — list / read / apply / advance / reset.
// All DB access goes through here so route handlers stay thin.

import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import type { DoctorApplyInput, DoctorListQuery } from '../../schemas/doctor';

export interface DoctorRow {
    id: string;
    userId: number | null;
    fullName: string;
    gender: 'male' | 'female';
    treatment: 'Allopathy' | 'Homoeopathy' | 'Ayurvedic';
    specialization: string;
    degree: string;
    experience: number;
    location: string;
    city: string;
    fees: number;
    timings: string;
    days: string;
    available: boolean;
    currentToken: number;
    totalTokens: number;
    maxTokens: number;
    createdAt: string;
}

export function toDoctor(d: {
    id: string;
    userId: number | null;
    fullName: string;
    gender: 'male' | 'female';
    treatment: 'Allopathy' | 'Homoeopathy' | 'Ayurvedic';
    specialization: string;
    degree: string;
    experience: number;
    location: string;
    city: string;
    fees: number;
    timings: string;
    days: string;
    available: boolean;
    currentToken: number;
    totalTokens: number;
    maxTokens: number;
    createdAt: Date;
}): DoctorRow {
    return {
        id: d.id,
        userId: d.userId,
        fullName: d.fullName,
        gender: d.gender,
        treatment: d.treatment,
        specialization: d.specialization,
        degree: d.degree,
        experience: d.experience,
        location: d.location,
        city: d.city,
        fees: d.fees,
        timings: d.timings,
        days: d.days,
        available: d.available,
        currentToken: d.currentToken,
        totalTokens: d.totalTokens,
        maxTokens: d.maxTokens,
        createdAt: d.createdAt.toISOString(),
    };
}

export async function listDoctors(query: DoctorListQuery): Promise<DoctorRow[]> {
    const where: {
        treatment?: 'Allopathy' | 'Homoeopathy' | 'Ayurvedic';
        city?: string;
        available?: boolean;
    } = {};
    if (query.treatment) where.treatment = query.treatment;
    if (query.city) where.city = query.city;
    if (query.activeOnly) where.available = true;

    let doctors = await prisma.doctor.findMany({
        where,
        orderBy: { createdAt: 'asc' },
    });

    if (query.search) {
        const q = query.search.toLowerCase();
        doctors = doctors.filter(
            (d) =>
                d.fullName.toLowerCase().includes(q) ||
                d.degree.toLowerCase().includes(q) ||
                d.specialization.toLowerCase().includes(q) ||
                d.location.toLowerCase().includes(q)
        );
    }

    return doctors.map(toDoctor);
}

export async function listActiveDoctors(limit?: number): Promise<DoctorRow[]> {
    const doctors = await prisma.doctor.findMany({
        where: { available: true },
        orderBy: [{ currentToken: 'desc' }, { createdAt: 'asc' }],
    });
    const slice = typeof limit === 'number' ? doctors.slice(0, limit) : doctors;
    return slice.map(toDoctor);
}

export async function getDoctor(id: string): Promise<DoctorRow> {
    const doc = await prisma.doctor.findUnique({ where: { id } });
    if (!doc) {
        throw new HttpError(404, 'Doctor not found.', 'NOT_FOUND');
    }
    return toDoctor(doc);
}

export async function applyAsDoctor(userId: number, input: DoctorApplyInput): Promise<DoctorRow> {
    // `crypto.randomUUID()` is available in Node 19+ and gives a 128-bit
    // collision-resistant id. The previous `Date.now() + 6 base36 chars`
    // shape collided on concurrent inserts and surfaced a 500.
    const id = `doc_${crypto.randomUUID()}`;
    let fullName = input.fullName;
    if (!/^dr\.?/i.test(fullName)) {
        fullName = `Dr. ${fullName}`;
    }
    const created = await prisma.doctor.create({
        data: {
            id,
            userId,
            fullName,
            gender: input.gender,
            treatment: input.treatment,
            specialization: input.specialization,
            degree: input.degree,
            experience: input.experience,
            location: input.location,
            city: input.city,
            fees: input.fees,
            timings: input.timings,
            days: input.days,
            available: true,
            currentToken: 0,
            totalTokens: 0,
            maxTokens: input.maxTokens,
        },
    });
    return toDoctor(created);
}

export async function advanceQueue(id: string, userId: number): Promise<DoctorRow> {
    const ok = await prisma.$transaction(async (tx) => {
        const doc = await tx.doctor.findUnique({ where: { id } });
        if (!doc || !doc.available) return false;
        // Ownership check: only the doctor who created the chamber may
        // advance its queue. The previous implementation trusted the URL
        // param alone, which is a textbook IDOR.
        if (doc.userId !== userId) return false;
        if (doc.currentToken >= doc.totalTokens) return false;
        await tx.doctor.update({
            where: { id },
            data: { currentToken: { increment: 1 } },
        });
        return true;
    });
    if (!ok) {
        throw new HttpError(
            400,
            'Queue cannot be advanced (already finished, doctor unavailable, or not your chamber).',
            'BUSINESS'
        );
    }
    const updated = await prisma.doctor.findUnique({ where: { id } });
    if (!updated) {
        throw new HttpError(404, 'Doctor not found.', 'NOT_FOUND');
    }
    return toDoctor(updated);
}

export async function resetQueue(id: string, userId: number): Promise<DoctorRow> {
    // Same ownership guard as advanceQueue. Resetting another doctor's
    // queue is a destructive privileged action and must be gated.
    const owned = await prisma.doctor.findUnique({
        where: { id },
        select: { userId: true },
    });
    if (!owned) {
        throw new HttpError(404, 'Doctor not found.', 'NOT_FOUND');
    }
    if (owned.userId !== userId) {
        throw new HttpError(403, 'You can only reset your own chamber queue.', 'FORBIDDEN');
    }
    await prisma.doctor.update({ where: { id }, data: { currentToken: 0 } });
    const updated = await prisma.doctor.findUnique({ where: { id } });
    if (!updated) {
        throw new HttpError(404, 'Doctor not found.', 'NOT_FOUND');
    }
    return toDoctor(updated);
}
