'use client';

// Doctor detail — profile + booking form (auth required to book).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { BookingForm } from '@/components/bookings/BookingForm';
import type { Doctor } from '@/types/api';

export default function DoctorDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id;
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        // Reset the error using a deferred update so we don't
        // unconditionally trigger a cascading render in the effect body.
        queueMicrotask(() => {
            if (!cancelled) setError((prev) => (prev === null ? prev : null));
        });
        api<{ data: { doctor: Doctor } }>(`/api/doctors/${id}`)
            .then((d) => {
                if (!cancelled) setDoctor(d.data.doctor);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(
                    e instanceof ApiError && e.status === 404
                        ? 'Doctor not found.'
                        : 'Failed to load doctor.'
                );
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (error) {
        return (
            <main className="max-w-[88rem] mx-auto px-6 py-12 flex flex-col gap-6 fade-in text-center" role="alert">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-3xl mx-auto mb-2 border border-red-100">
                    <i className="fas fa-exclamation-triangle" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-[#252a67] mb-1">Doctor Not Found</h3>
                <p className="text-sm text-gray-500 mb-6">{error}</p>
                <Link href="/doctors" className="px-6 py-3 font-bold rounded-2xl bg-[#252a67] text-white hover:bg-[#1e2258] transition-colors max-w-xs mx-auto">
                    Back to Directory
                </Link>
            </main>
        );
    }

    if (!doctor) {
        return (
            <div className="loading" role="status" aria-live="polite">
                <div className="spinner" />
                <span className="sr-only">Loading doctor profile…</span>
            </div>
        );
    }

    const isFull = doctor.currentToken >= doctor.maxTokens;
    const isAvailable = doctor.available && !isFull;

    return (
        <main className="max-w-[88rem] mx-auto px-6 py-8 flex flex-col gap-6 fade-in">
            {/* Breadcrumbs — use a real <nav> + <ol> so screen readers
                announce "breadcrumbs" and arrow keys are not required. */}
            <nav aria-label="Breadcrumb">
                <ol className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                    <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                    <li aria-hidden="true"><i className="fas fa-chevron-right text-[8px]" /></li>
                    <li><Link href="/doctors" className="hover:text-primary transition-colors">Available Doctors</Link></li>
                    <li aria-hidden="true"><i className="fas fa-chevron-right text-[8px]" /></li>
                    <li><span className="text-[#252a67]" aria-current="page">{doctor.fullName}</span></li>
                </ol>
            </nav>

            {/* Main Profile Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Left Section: Profile Card */}
                <div className="lg:col-span-5 space-y-6">
                    <article className="card rounded-3xl p-6 bg-white border border-[#252a67]/5 shadow-sm" aria-labelledby="doctor-name">
                        {/* Head Details */}
                        <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-[#252a67]/10 flex-shrink-0 flex items-center justify-center text-5xl" aria-hidden="true">
                                <span>{doctor.gender === 'male' ? '👨‍⚕️' : '👩‍⚕️'}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 id="doctor-name" className="text-xl font-black text-[#252a67] leading-tight">{doctor.fullName}</h1>
                                    <i className="fas fa-check-circle text-blue-500 text-sm" title="Verified Professional" aria-label="Verified professional" />
                                </div>
                                <p className="text-xs font-bold text-red-500 uppercase mt-0.5">{doctor.specialization}</p>
                                <p className="text-xs text-gray-500 font-medium">{doctor.degree}</p>
                                <p className="text-xs text-gray-400 mt-1">{doctor.experience} Yrs Exp</p>
                            </div>
                        </div>

                        {/* Chamber & Logistics details */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-[#252a67] border-b border-gray-50 pb-2">Chamber & Consult Info</h2>

                            <div className="flex items-start gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-map-marker-alt" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#252a67] text-xs">Chamber Address</p>
                                    <p className="text-gray-500 text-xs mt-0.5">{doctor.location}</p>
                                    <p className="text-gray-400 text-xs">{doctor.city}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center flex-shrink-0">
                                    <i className="far fa-clock" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#252a67] text-xs">Consult Timings</p>
                                    <p className="text-gray-500 text-xs mt-0.5">{doctor.timings}</p>
                                    <p className="text-gray-400 text-xs">{doctor.days}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center flex-shrink-0">
                                    <i className="fas fa-rupee-sign" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#252a67] text-xs">Consultation Fees</p>
                                    <p className="text-gray-900 font-bold text-sm mt-0.5">₹{doctor.fees}</p>
                                    <p className="text-gray-400 text-[10px]">Pay directly at the clinic chamber. Zero commission.</p>
                                </div>
                            </div>
                        </div>

                        {/* Live token metrics */}
                        <div className="mt-6 border-t border-gray-100 pt-6" aria-live="polite">
                            <div className="bg-[#252a67]/5 border border-[#252a67]/10 rounded-2xl p-4 flex justify-between items-center text-xs">
                                <div>
                                    <span className="text-gray-500 block font-medium">Chamber Live Queue</span>
                                    <span className="text-[10px] text-gray-400">Updates dynamically</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-md font-bold text-[#252a67] block">Serving Token {doctor.currentToken}/{doctor.totalTokens}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isAvailable ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                                        {isAvailable ? (
                                            <>
                                                <i className="fas fa-sync-alt animate-spin mr-0.5 text-[8px]" aria-hidden="true" /> Live Now
                                            </>
                                        ) : isFull ? (
                                            'Queue Full'
                                        ) : (
                                            'Away'
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </article>

                    {/* Chamber Map Mockup for rich aesthetics */}
                    <div className="card rounded-3xl p-6 overflow-hidden relative min-h-[160px] bg-sky-50 flex items-center justify-center border border-gray-100 shadow-sm">
                        <div className="absolute inset-0 bg-[radial-gradient(#252a67_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-10" aria-hidden="true" />
                        <div className="relative text-center p-4 z-10 flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-[#252a67] flex items-center justify-center text-white text-sm shadow-md mb-2">
                                <i className="fas fa-map-marked-alt" aria-hidden="true" />
                            </div>
                            <span className="font-bold text-[#252a67] text-xs">Chamber Location Map</span>
                            <span className="text-[10px] text-gray-500 mt-1 max-w-[200px]">{doctor.location}, {doctor.city}</span>
                            {/* The old "Get Directions" was a <span> with a
                                click handler — no keyboard support, no real
                                navigation. Open a Google Maps search for
                                the chamber address, with safe rel attrs for
                                a `target="_blank"` link. */}
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${doctor.location}, ${doctor.city}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-red-500 hover:underline mt-2 cursor-pointer"
                            >
                                <i className="fas fa-external-link-alt mr-1" aria-hidden="true" />
                                Get Directions
                            </a>
                        </div>
                    </div>
                </div>

                {/* Right Section: Booking Form Panel */}
                <div className="lg:col-span-7 bg-white border border-gray-100 rounded-3xl p-6 lg:p-8 shadow-sm">
                    <BookingForm doctor={doctor} />
                </div>
            </div>
        </main>
    );
}
