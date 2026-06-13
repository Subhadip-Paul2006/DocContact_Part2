'use client';

// Doctors list — filterable. URL search params drive the filters.

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { DoctorCard } from '@/components/doctors/DoctorCard';
import { DoctorFilters } from '@/components/doctors/DoctorFilters';
import type { Doctor, Treatment } from '@/types/api';

// `useSearchParams` opt-out of static prerendering for the filter UI.
export const dynamic = 'force-dynamic';

function DoctorsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [doctors, setDoctors] = useState<Doctor[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const search = searchParams.get('search') ?? '';
    const treatment = (searchParams.get('treatment') ?? searchParams.get('category') ?? '') as Treatment | '';
    const city = searchParams.get('city') ?? '';
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // The text input is wired straight to the URL, but we don't want
    // to fire a server request on every keystroke. The debounced value
    // is the one we actually fetch on; the immediate value still drives
    // the controlled input so the UI feels instant.
    const debouncedSearch = useDebouncedValue(search, 250);

    useEffect(() => {
        // Cancel any in-flight request first so a stale response can't
        // overwrite a fresher one when filters change rapidly.
        const ctrl = new AbortController();
        const qs = new URLSearchParams();
        if (debouncedSearch) qs.set('search', debouncedSearch);
        if (treatment) qs.set('treatment', treatment);
        if (city) qs.set('city', city);
        if (activeOnly) qs.set('activeOnly', 'true');

        // Defer the loading-state reset to a microtask so the effect
        // body itself stays free of synchronous setState calls.
        queueMicrotask(() => {
            setDoctors((prev) => (prev === null ? prev : null));
            setError((prev) => (prev === null ? prev : null));
        });
        api<{ data: { doctors: Doctor[] } }>(`/api/doctors?${qs.toString()}`, { signal: ctrl.signal })
            .then((d) => {
                if (ctrl.signal.aborted) return;
                setDoctors(d.data.doctors);
            })
            .catch((e) => {
                if (ctrl.signal.aborted) return;
                setError(e instanceof Error ? e.message : 'Failed to load doctors.');
            });
        return () => {
            ctrl.abort();
        };
    }, [debouncedSearch, treatment, city, activeOnly]);

    // Construct persistent list of cities so filtering does not empty the select options
    const citiesList = useMemo(() => {
        const defaultCities = ['Berhampore', 'Kolkata', 'Siliguri', 'Durgapur'];
        if (!doctors) return defaultCities;
        const foundCities = doctors.map((d) => d.city);
        return Array.from(new Set([...defaultCities, ...foundCities])).sort();
    }, [doctors]);

    const update = (next: {
        search?: string;
        treatment?: Treatment | '';
        city?: string;
        activeOnly?: boolean;
    }) => {
        const sp = new URLSearchParams(searchParams.toString());
        // Clean out legacy "category" query if we transition filters
        sp.delete('category');
        
        if (next.search !== undefined) {
            if (next.search) sp.set('search', next.search);
            else sp.delete('search');
        }
        if (next.treatment !== undefined) {
            if (next.treatment) sp.set('treatment', next.treatment);
            else sp.delete('treatment');
        }
        if (next.city !== undefined) {
            if (next.city) sp.set('city', next.city);
            else sp.delete('city');
        }
        if (next.activeOnly !== undefined) {
            if (next.activeOnly) sp.set('activeOnly', 'true');
            else sp.delete('activeOnly');
        }
        router.replace(`/doctors?${sp.toString()}`);
    };

    return (
        <main className="max-w-[88rem] mx-auto px-6 py-8 flex flex-col gap-6 fade-in">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb">
                <ol className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                    <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
                    <li aria-hidden="true"><i className="fas fa-chevron-right text-[8px]" /></li>
                    <li><span className="text-[#252a67]" aria-current="page">Available Doctors</span></li>
                </ol>
            </nav>

            {/* Page Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-[#252a67] flex items-center gap-2">
                        Find Verified Doctors
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Book consultations with verified specialist doctors across West Bengal chambers.</p>
                </div>
            </div>

            {/* Filter Panel */}
            <DoctorFilters
                search={search}
                treatment={treatment}
                city={city}
                cities={citiesList}
                activeOnly={activeOnly}
                onChange={update}
            />

            {error && <div className="error-banner" role="alert">{error}</div>}

            {/* Results Count Info — `aria-live` so screen readers announce
                the new count after each filter change. */}
            {doctors !== null && (
                <div
                    className="text-sm font-bold text-gray-500 mb-2"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    Showing {doctors.length} verified doctor{doctors.length === 1 ? '' : 's'} in West Bengal
                </div>
            )}

            {/* Grid listings */}
            {doctors === null ? (
                <div className="loading" role="status" aria-live="polite">
                    <div className="spinner" />
                    <span className="sr-only">Loading doctors…</span>
                </div>
            ) : doctors.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 text-3xl mx-auto mb-4">
                        <i className="fas fa-user-md" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold text-[#252a67] mb-1">No Doctors Found</h3>
                    <p className="text-sm text-gray-500">We couldn&apos;t find any doctors matching your current filters. Try resetting search fields.</p>
                </div>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" role="list">
                    {doctors.map((d) => (
                        <li key={d.id}>
                            <DoctorCard doctor={d} />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}

export default function DoctorsPage() {
    return (
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
            <DoctorsPageInner />
        </Suspense>
    );
}
