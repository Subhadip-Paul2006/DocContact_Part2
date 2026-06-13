// Booking service — create (with the queue-full CAS) + list by user.

import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import type { CreateBookingInput } from '../../schemas/booking';
import type { DoctorRow } from '../doctors/service';
import { toDoctor } from '../doctors/service';

export interface BookingRow {
    id: string;
    userId: number;
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    doctorLocation: string;
    doctorCity: string;
    bookingDate: string;
    timeSlot: string;
    patientName: string;
    patientPhone: string;
    patientAge: string;
    patientGender: string;
    tokenNumber: number;
    bookedAt: string;
    doctor: DoctorRow | null;
}

function toBooking(b: {
    id: string;
    userId: number;
    doctorId: string;
    doctorName: string;
    doctorSpecialization: string;
    doctorLocation: string;
    doctorCity: string;
    bookingDate: string;
    timeSlot: string;
    patientName: string;
    patientPhone: string;
    patientAge: string;
    patientGender: string;
    tokenNumber: number;
    bookedAt: Date;
    doctor?: unknown;
}): BookingRow {
    return {
        id: b.id,
        userId: b.userId,
        doctorId: b.doctorId,
        doctorName: b.doctorName,
        doctorSpecialization: b.doctorSpecialization,
        doctorLocation: b.doctorLocation,
        doctorCity: b.doctorCity,
        bookingDate: b.bookingDate,
        timeSlot: b.timeSlot,
        patientName: b.patientName,
        patientPhone: b.patientPhone,
        patientAge: b.patientAge,
        patientGender: b.patientGender,
        tokenNumber: b.tokenNumber,
        bookedAt: b.bookedAt.toISOString(),
        doctor: b.doctor ? toDoctor(b.doctor as Parameters<typeof toDoctor>[0]) : null,
    };
}

export async function createBooking(userId: number, input: CreateBookingInput): Promise<BookingRow> {
    // 128-bit collision-resistant id. The previous `Date.now() + 4
    // base36 chars` shape (~20 bits of entropy, millisecond-shared
    // across concurrent requests) collided under load and surfaced
    // as a 500 from the second `prisma.booking.create`.
    const bookingId = `bk_${crypto.randomUUID()}`;

    const booking = await prisma.$transaction(async (tx) => {
        const doc = await tx.doctor.findUnique({ where: { id: input.doctorId } });
        if (!doc) {
            throw new HttpError(404, 'Doctor not found.', 'NOT_FOUND');
        }
        if (doc.totalTokens >= doc.maxTokens) {
            throw new HttpError(400, 'Doctor chamber queue is full for today!', 'BUSINESS');
        }
        const updated = await tx.doctor.updateMany({
            where: { id: input.doctorId, totalTokens: { lt: doc.maxTokens } },
            data: { totalTokens: { increment: 1 } },
        });
        if (updated.count === 0) {
            throw new HttpError(400, 'Doctor chamber queue is full for today!', 'BUSINESS');
        }
        const newToken = doc.totalTokens + 1;
        return tx.booking.create({
            data: {
                id: bookingId,
                userId,
                doctorId: doc.id,
                doctorName: doc.fullName,
                doctorSpecialization: doc.specialization,
                doctorLocation: doc.location,
                doctorCity: doc.city,
                bookingDate: input.bookingDate,
                timeSlot: input.timeSlot,
                patientName: input.patientName,
                patientPhone: input.patientPhone,
                patientAge: input.patientAge,
                patientGender: input.patientGender,
                tokenNumber: newToken,
            },
        });
    });

    return toBooking(booking);
}

export async function listBookingsForUser(userId: number): Promise<BookingRow[]> {
    const rows = await prisma.booking.findMany({
        where: { userId },
        orderBy: { bookedAt: 'desc' },
        include: { doctor: true },
    });
    return rows.map(toBooking);
}
