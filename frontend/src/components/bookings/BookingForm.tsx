'use client';

// BookingForm — date options, time slot picker, patient details, submit.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import type { Booking, Doctor, PatientGender } from '@/types/api';

const TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
];

// Hoisted to module scope so the per-render `dates.map` doesn't
// re-allocate these arrays on every booking row.
const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Pure helper for the success modal. Kept at module scope because
// the inputs don't depend on component state.
function formatReceiptDate(value: string): string {
    try {
        const dateObj = new Date(value);
        if (Number.isNaN(dateObj.getTime())) return value;
        return `${dateObj.getDate()} ${MONTHS_SHORT[dateObj.getMonth()]}`;
    } catch {
        return value;
    }
}

function nextDates(n: number): string[] {
    const out: string[] = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        out.push(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
    return out;
}

interface FormState {
    date: string;
    timeSlot: string;
    patientName: string;
    patientPhone: string;
    patientAge: string;
    patientGender: PatientGender;
}

function validate(state: FormState): string[] {
    const errors: string[] = [];
    if (!state.date) errors.push('Please select an appointment date.');
    if (!state.timeSlot) errors.push('Please select a session slot.');
    if (!state.patientName || state.patientName.trim().length < 2) {
        errors.push("Patient's full name is required.");
    }
    if (!/^\d{10}$/.test(state.patientPhone)) {
        errors.push('Mobile phone must be exactly 10 digits.');
    }
    const ageNum = parseInt(state.patientAge, 10);
    if (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        errors.push('Please enter a valid age between 1 and 120.');
    }
    if (!state.patientGender) errors.push('Please select a gender.');
    return errors;
}

export function BookingForm({ doctor }: { doctor: Doctor }) {
    const { user } = useAuth();
    const router = useRouter();
    const dates = useMemo(() => nextDates(6), []);
    const [state, setState] = useState<FormState>({
        date: dates[0],
        timeSlot: '',
        patientName: user?.name ?? '',
        patientPhone: '',
        patientAge: '',
        patientGender: 'Male',
    });
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [result, setResult] = useState<Booking | null>(null);
    // Memoize the success-modal date label so we only format once
    // per booking date (the modal otherwise rebuilds this on every
    // parent re-render, including the loading/error toggles that
    // happen between modal open and close).
    const receiptDate = useMemo(
        () => (result ? formatReceiptDate(result.bookingDate) : ''),
        [result]
    );

    const update = (patch: Partial<FormState>) => setState((s) => ({ ...s, ...patch }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError(null);
        const v = validate(state);
        setErrors(v);
        if (v.length > 0) return;
        setSubmitting(true);
        try {
            const data = await api<{ data: { booking: Booking } }>('/api/bookings', {
                method: 'POST',
                body: {
                    doctorId: doctor.id,
                    bookingDate: state.date,
                    timeSlot: state.timeSlot,
                    patientName: state.patientName.trim(),
                    patientPhone: state.patientPhone.trim(),
                    patientAge: state.patientAge.trim(),
                    patientGender: state.patientGender,
                },
            });
            setResult(data.data.booking);
        } catch (err) {
            setServerError(err instanceof ApiError ? err.message : 'Could not book. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (result) {
        return (
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-success-title"
                aria-describedby="booking-success-desc"
            >
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 flex flex-col text-center">

                    {/* Success Checked Icon */}
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 text-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                        <i className="fas fa-check" aria-hidden="true" />
                    </div>

                    <h2 id="booking-success-title" className="text-xl font-black text-[#252a67] leading-tight">Appointment Booked!</h2>
                    <p id="booking-success-desc" className="text-xs text-gray-500 mt-1">Your chamber token has been generated successfully.</p>

                    {/* Receipt ticket detail */}
                    <div className="my-6 border-2 border-dashed border-[#252a67]/20 rounded-2xl p-5 bg-[#252a67]/5 text-left relative overflow-hidden">
                        {/* Round ticket punches */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-r border-[#252a67]/20" aria-hidden="true" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border-l border-[#252a67]/20" aria-hidden="true" />

                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">ZEN Doctor Token</span>
                            <span className="text-xs font-bold text-red-500 uppercase">{doctor.treatment}</span>
                        </div>
                        <h4 className="font-bold text-[#252a67] text-md">{doctor.fullName}</h4>
                        <p className="text-[10px] text-gray-500">{doctor.specialization}</p>
                        <div className="h-px bg-[#252a67]/10 my-3" />

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-gray-400 text-[10px] block">Patient Name</span>
                                <strong className="text-[#252a67] font-bold">{result.patientName}</strong>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-400 text-[10px] block">Token Number</span>
                                <strong className="text-red-500 text-lg font-black">Token #{result.tokenNumber}</strong>
                            </div>
                            <div>
                                <span className="text-gray-400 text-[10px] block">Appt Date</span>
                                <strong className="text-[#252a67] font-bold">{receiptDate}</strong>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-400 text-[10px] block">Session Time</span>
                                <strong className="text-[#252a67] font-bold">{result.timeSlot}</strong>
                            </div>
                        </div>
                    </div>

                    <p className="text-[11px] text-gray-400 mb-6">
                        Track your token status live in the bookings dashboard.
                    </p>

                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={() => router.push('/tracker')}
                            className="w-full py-3 px-4 font-bold text-xs text-white bg-[#252a67] hover:bg-[#1e2258] rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                            <i className="fas fa-desktop mr-1.5" aria-hidden="true" /> Track Live Chamber Queue
                        </button>
                        <button
                            type="button"
                            onClick={() => setResult(null)}
                            className="w-full py-2.5 px-4 font-bold text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                        >
                            Close Receipt
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate={false}>
            <h2 className="text-xl font-black text-[#252a67] mb-2 flex items-center gap-2">
                <i className="far fa-calendar-check text-red-500" aria-hidden="true" /> Book Chamber Appointment
            </h2>
            <p className="text-xs text-gray-500 border-b border-gray-100 pb-4 mb-6">Fill in the details below to reserve your token slot. No advance payment required.</p>

            {serverError && <div className="error-banner mb-4" role="alert">{serverError}</div>}

            {/* Step 1: Date Selection — real radio inputs hidden behind
                styled labels, so keyboard users can arrow through the
                grid instead of single-tabbing every cell. */}
            <fieldset>
                <legend className="block text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">1. Select Appointment Date</legend>
                <div
                    className="grid grid-cols-3 md:grid-cols-6 gap-3"
                    role="radiogroup"
                    aria-label="Appointment date"
                >
                    {dates.map((dateStr) => {
                        const isSelected = state.date === dateStr;
                        const dateObj = new Date(dateStr);
                        const dayName = DAYS_OF_WEEK_SHORT[dateObj.getDay()];
                        const dayNum = dateObj.getDate();
                        const monthName = MONTHS_SHORT[dateObj.getMonth()];

                        return (
                            <label
                                key={dateStr}
                                className={`border-2 rounded-2xl p-2.5 text-center cursor-pointer transition-all select-none ${
                                    isSelected
                                        ? 'border-[#252a67] bg-[#252a67]/5 text-[#252a67]'
                                        : 'border-gray-200 hover:border-[#252a67]/50 text-gray-600 bg-white'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="booking-date"
                                    value={dateStr}
                                    checked={isSelected}
                                    onChange={() => update({ date: dateStr })}
                                    className="sr-only"
                                />
                                <span className="block text-[9px] font-bold uppercase tracking-wider opacity-60">{dayName}</span>
                                <strong className="block text-md font-black mt-0.5">{dayNum}</strong>
                                <span className="block text-[9px] font-semibold">{monthName}</span>
                                <span className="sr-only">{`${dayName} ${dayNum} ${monthName}${isSelected ? ', selected' : ''}`}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            {/* Step 2: Time Slots */}
            <fieldset>
                <legend className="block text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">2. Select Session Slot</legend>
                <div
                    className="grid grid-cols-2 sm:grid-cols-5 gap-2.5"
                    role="radiogroup"
                    aria-label="Session time slot"
                >
                    {TIME_SLOTS.map((slot) => {
                        const isSelected = state.timeSlot === slot;
                        return (
                            <label
                                key={slot}
                                className={`border rounded-xl py-2 px-1 text-center cursor-pointer transition-all text-xs font-bold select-none ${
                                    isSelected
                                        ? 'border-[#252a67] bg-[#252a67] text-white'
                                        : 'border-gray-200 hover:border-[#252a67] text-[#252a67] bg-white'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="time-slot"
                                    value={slot}
                                    checked={isSelected}
                                    onChange={() => update({ timeSlot: slot })}
                                    className="sr-only"
                                />
                                {slot}
                                <span className="sr-only">{isSelected ? ', selected' : ''}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            {/* Step 3: Patient Info */}
            <fieldset className="space-y-4 border-t border-gray-100 pt-6">
                <legend className="block text-xs font-bold uppercase text-gray-400 tracking-wider">3. Patient Information</legend>

                <div>
                    <label htmlFor="pname" className="block text-xs font-bold text-gray-600 mb-1">Patient&apos;s Full Name</label>
                    <input
                        id="pname"
                        type="text"
                        required
                        autoComplete="name"
                        maxLength={100}
                        value={state.patientName}
                        onChange={(e) => update({ patientName: e.target.value })}
                        className="py-2.5 px-4 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
                        placeholder="Enter patient's name..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="pphone" className="block text-xs font-bold text-gray-600 mb-1">Mobile Number (For Token SMS)</label>
                        <input
                            id="pphone"
                            type="tel"
                            required
                            pattern="[0-9]{10}"
                            maxLength={10}
                            autoComplete="tel"
                            inputMode="numeric"
                            value={state.patientPhone}
                            onChange={(e) => update({ patientPhone: e.target.value.replace(/\D/g, '') })}
                            className="py-2.5 px-4 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
                            placeholder="10-digit number..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="page" className="block text-xs font-bold text-gray-600 mb-1">Age</label>
                            <input
                                id="page"
                                type="number"
                                min={1}
                                max={120}
                                required
                                autoComplete="off"
                                inputMode="numeric"
                                value={state.patientAge}
                                onChange={(e) => update({ patientAge: e.target.value })}
                                className="py-2.5 px-4 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
                                placeholder="e.g. 35"
                            />
                        </div>
                        <div>
                            <label htmlFor="pgender" className="block text-xs font-bold text-gray-600 mb-1">Gender</label>
                            <select
                                id="pgender"
                                required
                                value={state.patientGender}
                                onChange={(e) => update({ patientGender: e.target.value as PatientGender })}
                                className="py-2.5 px-3 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50 cursor-pointer"
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
            </fieldset>

            {/* Validation errors banner */}
            {errors.length > 0 && (
                <div className="error-banner" role="alert" aria-live="assertive">
                    {errors.map((e, i) => (
                        <div key={i}>{e}</div>
                    ))}
                </div>
            )}

            {/* Booking Submission Info */}
            <div className="bg-red-50 text-red-600 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
                <i className="fas fa-info-circle mt-0.5 flex-shrink-0 text-sm" aria-hidden="true" />
                <p className="text-[11px] leading-relaxed">
                    <strong>Important Note:</strong> This booking assigns a chamber token. Token numbers are issued sequentially in the order of bookings. The live status tracker will show you who is being served right now.
                </p>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 font-bold text-sm text-white bg-[#252a67] hover:bg-[#1e2258] rounded-2xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#252a67]/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
                <i className="far fa-check-circle text-md" aria-hidden="true" />
                {submitting ? 'Booking & Generating Token…' : 'Book Appointment & Generate Token'}
            </button>
        </form>
    );
}
