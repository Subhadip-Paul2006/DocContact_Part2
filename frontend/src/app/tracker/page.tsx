'use client';

// Tracker — list the logged-in user's bookings with live queue position.
// SSE drives the refetch; on error, fall back to 10s polling.

// Live queue + auth — opt out of static prerendering.
export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import { useQueueStream } from '@/features/queue/useQueueStream';
import type { Booking } from '@/types/api';

export default function TrackerPage() {
    const { user, ready } = useAuth();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const refreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchBookings = useCallback(async () => {
        try {
            const data = await api<{ data: { bookings: Booking[] } }>('/api/bookings');
            setBookings(data.data.bookings);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load bookings.');
        }
    }, []);

    const scheduleRefetch = useCallback(() => {
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
        refreshTimeout.current = setTimeout(() => {
            fetchBookings();
        }, 500);
    }, [fetchBookings]);

    useQueueStream(scheduleRefetch);

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace('/login?next=%2Ftracker');
            return;
        }
        // Trigger the initial fetch via a microtask rather than the
        // effect body so we don't cascade-render synchronously.
        const initialFetch = setTimeout(fetchBookings, 0);
        // Fallback poll in case the SSE stream isn't reachable.
        if (!pollRef.current) pollRef.current = setInterval(fetchBookings, 10000);
        return () => {
            clearTimeout(initialFetch);
            if (pollRef.current) clearInterval(pollRef.current);
            if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
            pollRef.current = null;
            refreshTimeout.current = null;
        };
    }, [ready, user, router, fetchBookings]);

    const handleAdvance = async (doctorId: string) => {
        try {
            await api(`/api/doctors/${doctorId}/advance`, { method: 'POST' });
            fetchBookings();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not advance queue.');
        }
    };

    const handleReset = async (doctorId: string) => {
        try {
            await api(`/api/doctors/${doctorId}/reset`, { method: 'POST' });
            fetchBookings();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not reset queue.');
        }
    };

    if (!user) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <main className="max-w-[88rem] mx-auto px-6 py-8 flex flex-col gap-6 fade-in">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb">
                <ol className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                    <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                    <li aria-hidden="true"><i className="fas fa-chevron-right text-[8px]" /></li>
                    <li><span className="text-[#252a67]" aria-current="page">My Bookings & Tracker</span></li>
                </ol>
            </nav>

            {/* Page Title */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-[#252a67] flex items-center gap-2">
                    <i className="fas fa-desktop text-red-500 text-2xl" aria-hidden="true" /> Live Queue Tracker
                </h1>
                <p className="text-gray-500 text-sm mt-1">Track your active chamber token status in real-time. Stand by when your turn approaches.</p>
            </div>

            {/* Simulation Banner */}
            <div className="bg-[#252a67]/5 border border-[#252a67]/20 rounded-2xl p-4 text-xs flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#252a67]/10 flex items-center justify-center text-[#252a67] text-sm flex-shrink-0">
                        <i className="fas fa-robot" aria-hidden="true" />
                    </span>
                    <div>
                        <strong className="text-[#252a67] block font-bold">Simulator Active</strong>
                        <span className="text-gray-500">Chamber queues will automatically advance patient tokens every 25 seconds in the background.</span>
                    </div>
                </div>
                <div className="hidden md:block">
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 py-1 px-3 border border-emerald-100 rounded-full font-bold">
                        <i className="fas fa-sync-alt animate-spin text-[8px] mr-1" aria-hidden="true" /> Running
                    </span>
                </div>
            </div>

            {error && <div className="error-banner" role="alert">{error}</div>}

            {bookings === null ? (
                <div className="loading" role="status" aria-live="polite">
                    <div className="spinner" />
                    <span className="sr-only">Loading your bookings…</span>
                </div>
            ) : bookings.length === 0 ? (
                <div className="text-center bg-white border border-gray-100 rounded-3xl p-12 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 text-3xl mx-auto mb-4">
                        <i className="far fa-calendar-times" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-[#252a67] mb-1">No Bookings Found</h3>
                    <p className="text-sm text-gray-500 mb-6">You haven&apos;t booked any chamber doctor appointments yet.</p>
                    <Link href="/doctors" className="px-6 py-3 font-bold rounded-2xl bg-[#252a67] text-white hover:bg-[#1e2258] transition-colors text-sm shadow-sm">
                        Discover Available Doctors
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {bookings.map((b) => {
                        const doc = b.doctor;
                        const current = doc?.currentToken ?? 0;
                        const wait = Math.max(0, b.tokenNumber - current);
                        const yourTurn = wait === 0 && current >= b.tokenNumber;
                        const isMissed = current > b.tokenNumber;

                        // Formatting date
                        let formattedDate = b.bookingDate;
                        try {
                            const dateObj = new Date(b.bookingDate);
                            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            formattedDate = `${daysOfWeek[dateObj.getDay()]}, ${dateObj.getDate()} ${dateObj.toLocaleString('en-US', { month: 'short' })}`;
                        } catch {
                            // fallback
                        }

                        return (
                            <div 
                                key={b.id} 
                                className={`card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-stretch justify-between gap-6 transition-all bg-white border border-[#252a67]/5 shadow-sm ${
                                    yourTurn ? 'bg-emerald-50/20 border-emerald-300' : ''
                                }`}
                            >
                                {/* Left block: doctor and patient booking details */}
                                <div className="flex-grow flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black text-white bg-red-500 py-0.5 px-2.5 rounded-full uppercase tracking-wider">Chamber Booked</span>
                                            <span className="text-[10px] font-bold text-gray-500">ID: {b.id.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-[#252a67]">{b.doctorName}</h3>
                                        <p className="text-xs text-red-500 font-bold mt-0.5">{b.doctorSpecialization}</p>

                                        <div className="grid grid-cols-2 gap-4 mt-4 text-xs border-t border-gray-50 pt-4 max-w-md">
                                            <div>
                                                <span className="text-gray-400 block">Patient Name</span>
                                                <strong className="text-[#252a67] font-bold">{b.patientName} ({b.patientAge} Yrs, {b.patientGender})</strong>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 block">Scheduled Timing</span>
                                                <strong className="text-[#252a67] font-bold">{formattedDate} at {b.timeSlot}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Developer/Testing manual controls — gated
                                        to doctor accounts so a malicious
                                        patient who guesses the endpoint
                                        cannot reach them. The route is
                                        `withAuth`-guarded server-side already,
                                        but the client UI is also restricted
                                        to `user.role === 'doctor'`. */}
                                    {user?.role === 'doctor' && (
                                        <div className="mt-6 border-t border-gray-100 pt-4 flex flex-wrap gap-2 items-center">
                                            <span className="text-[10px] text-gray-400 font-medium">Test Controls:</span>
                                            <button
                                                type="button"
                                                onClick={() => handleAdvance(b.doctorId)}
                                                className="py-1 px-3 bg-gray-100 hover:bg-[#252a67] hover:text-white rounded-lg text-[10px] font-bold text-[#252a67] transition-all flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#252a67]/40 cursor-pointer"
                                            >
                                                <i className="fas fa-plus text-[8px]" aria-hidden="true" /> Call Next Patient
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReset(b.doctorId)}
                                                className="py-1 px-3 bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-lg text-[10px] font-bold text-gray-400 transition-all flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-300 cursor-pointer"
                                            >
                                                <i className="fas fa-undo text-[8px]" aria-hidden="true" /> Reset Queue
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Right block: Large ticket status metrics */}
                                <div className="w-full md:w-80 md:border-l md:border-gray-100 md:pl-8 flex flex-col justify-between">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                                        <div className="bg-red-50 text-red-500 p-2 rounded-xl text-center min-w-[70px]">
                                            <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider leading-none">Your Token</span>
                                            <strong className="text-xl font-black mt-0.5 leading-none block">#{b.tokenNumber}</strong>
                                        </div>
                                        <div className="bg-[#252a67]/5 text-[#252a67] p-2 rounded-xl text-center min-w-[80px]">
                                            <span className="text-[9px] text-gray-400 block uppercase font-bold tracking-wider leading-none">Serving Now</span>
                                            <strong className="text-xl font-black mt-0.5 leading-none block">{current}</strong>
                                        </div>
                                    </div>

                                    {/* aria-live announces the state transition
                                        so a screen reader user hears the
                                        "your turn" change as soon as the
                                        queue advances. */}
                                    <div aria-live="polite" aria-atomic="true">
                                        {yourTurn ? (
                                            <>
                                                <div className="bg-emerald-500 text-white rounded-2xl p-4 animate-pulse flex items-center justify-between shadow-md shadow-emerald-100">
                                                    <span className="font-black flex items-center gap-2 text-sm"><i className="fas fa-bullhorn" aria-hidden="true" /> IT&apos;S YOUR TURN!</span>
                                                    <span className="font-black text-xs uppercase tracking-wide">Enter Chamber</span>
                                                </div>
                                                <p className="text-emerald-600 font-bold text-[10px] text-right mt-1.5">Please report to the compounder immediately.</p>
                                            </>
                                        ) : isMissed ? (
                                            <>
                                                <div className="bg-gray-100 text-gray-500 rounded-2xl p-4 flex items-center justify-between">
                                                    <span className="font-bold flex items-center gap-2"><i className="fas fa-check-circle" aria-hidden="true" /> Appointment:</span>
                                                    <span className="font-bold text-xs uppercase tracking-wider">Passed / Missed</span>
                                                </div>
                                                <p className="text-gray-400 text-[10px] text-right mt-1.5 font-medium">This session token has already passed.</p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="bg-[#252a67]/5 text-[#252a67] border border-[#252a67]/10 rounded-2xl p-4 flex items-center justify-between">
                                                    <span className="font-bold flex items-center gap-2 text-xs"><i className="fas fa-hourglass-half text-[#252a67]" aria-hidden="true" /> Chamber Status:</span>
                                                    <span className="font-black text-xs text-right">{wait} patient{wait === 1 ? '' : 's'} ahead</span>
                                                </div>
                                                <p className="text-gray-400 text-[10px] text-right mt-1.5">Please arrive at the chamber at least 15 mins before your token is called.</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
