'use client';

// Home page — hero search layout, categories, live chambers list, value props.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Doctor, Treatment } from '@/types/api';

export default function HomePage() {
    const router = useRouter();
    const [activeDoctors, setActiveDoctors] = useState<Doctor[] | null>(null);
    const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
    const [search, setSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    // Re-anchor the "close on outside click" effect to the boolean form of
    // the open state. setState in the effect below is allowed because it's
    // a callback into the DOM event handler, not a top-level write.
    const searchOpenLive = searchOpen;

    useEffect(() => {
        // Single controller shared across both requests so unmount or
        // re-mount cancels both in-flight fetches together.
        const ctrl = new AbortController();
        Promise.all([
            api<{ data: { doctors: Doctor[] } }>('/api/doctors/active?limit=4', { signal: ctrl.signal }),
            api<{ data: { doctors: Doctor[] } }>('/api/doctors?activeOnly=true', { signal: ctrl.signal }),
        ])
            .then(([active, available]) => {
                if (ctrl.signal.aborted) return;
                setActiveDoctors(active.data.doctors);
                setAllDoctors(available.data.doctors);
            })
            .catch((e) => {
                if (ctrl.signal.aborted) return;
                // Network failure is non-fatal — the home page still
                // renders, just without live chamber data.
                if (e instanceof Error && e.name === 'AbortError') return;
                setActiveDoctors([]);
                setAllDoctors([]);
            });
        return () => {
            ctrl.abort();
        };
    }, []);

    // Filter all doctors for live autocomplete search results
    const matches = useMemo(() => {
        if (!search.trim()) return [];
        const q = search.trim().toLowerCase();
        return allDoctors
            .filter(
                (d) =>
                    d.fullName.toLowerCase().includes(q) ||
                    d.specialization.toLowerCase().includes(q) ||
                    d.treatment.toLowerCase().includes(q) ||
                    d.city.toLowerCase().includes(q) ||
                    d.location.toLowerCase().includes(q)
            )
            .slice(0, 6);
    }, [search, allDoctors]);

    // Open the dropdown when there are real matches; close on outside
    // click and on Escape so keyboard users can dismiss. `searchOpen` is
    // a local boolean we own — we mirror `hasMatches` into it on focus
    // and on each keystroke instead of reading it as the source of truth.
    useEffect(() => {
        if (!searchOpenLive) return;
        const onPointerDown = (e: MouseEvent) => {
            const root = searchContainerRef.current;
            if (root && !root.contains(e.target as Node)) {
                setSearchOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSearchOpen(false);
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [searchOpenLive]);

    const goTreatment = (t: Treatment) => {
        router.push(`/doctors?category=${t}`);
    };

    return (
        <div className="max-w-[88rem] mx-auto px-6 py-6 flex flex-col gap-12 fade-in">
            {/* Hero Search Section */}
            <section className="text-center py-10 md:py-16 flex flex-col items-center gap-6" aria-labelledby="hero-title">
                <h1 id="hero-title" className="text-3xl md:text-5xl font-black text-[#252a67] max-w-3xl leading-tight">
                    Find Verified Doctors Near You in <span className="text-red-500 underline decoration-wavy">West Bengal</span>
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl">
                    Search verified Allopathy, Homoeopathy, and Ayurvedic doctors. See real-time availability, track live clinic queues, and book instantly.
                </p>

                {/* Search Box */}
                <div className="w-full max-w-2xl mt-4 relative" ref={searchContainerRef} role="search">
                    <label htmlFor="hero-search" className="sr-only">Search doctors</label>
                    <div className="border-2 border-[#252a67]/20 focus-within:border-[#252a67] bg-white rounded-3xl shadow-lg transition-all flex items-center p-1">
                        <div className="flex items-center w-full">
                            <i className="fas fa-search text-[#252a67]/40 text-xl ml-5 mr-3" aria-hidden="true" />
                            <input
                                ref={searchInputRef}
                                id="hero-search"
                                type="text"
                                inputMode="search"
                                autoComplete="off"
                                className="py-3 px-1 rounded-2xl w-full text-lg border-none outline-none text-[#252a67] bg-transparent"
                                placeholder="Search by name, city, or specialty (e.g. Roy, Berhampore)..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    if (matches.length > 0) setSearchOpen(true);
                                }}
                                onFocus={() => matches.length > 0 && setSearchOpen(true)}
                                aria-expanded={searchOpen && matches.length > 0}
                                aria-controls="hero-search-listbox"
                                aria-autocomplete="list"
                                aria-haspopup="listbox"
                                role="combobox"
                            />
                        </div>
                    </div>

                    {/* Autocomplete dropdown list — rendered as a real listbox
                        so screen readers can announce "list with N options" and
                        arrow keys work. */}
                    {searchOpen && matches.length > 0 && (
                        <ul
                            id="hero-search-listbox"
                            role="listbox"
                            aria-label="Doctor suggestions"
                            className="absolute left-0 w-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto"
                        >
                            {matches.map((d) => (
                                <li
                                    key={d.id}
                                    role="option"
                                    aria-selected="false"
                                    tabIndex={0}
                                    onClick={() => {
                                        setSearch('');
                                        setSearchOpen(false);
                                        router.push(`/doctors/${d.id}`);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSearch('');
                                            setSearchOpen(false);
                                            router.push(`/doctors/${d.id}`);
                                        }
                                    }}
                                    className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex items-center justify-between gap-4 transition-all text-left"
                                >
                                    <span className="flex items-center gap-3">
                                        <span className="w-10 h-10 rounded-full bg-[#252a67]/10 flex items-center justify-center text-[#252a67] font-bold" aria-hidden="true">
                                            {d.gender === 'male' ? '👨‍⚕️' : '👩‍⚕️'}
                                        </span>
                                        <span>
                                            <h4 className="font-bold text-[#252a67]">{d.fullName}</h4>
                                            <p className="text-xs text-gray-500">{d.degree} • {d.specialization}</p>
                                        </span>
                                    </span>
                                    <span className="text-right">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${d.available ? 'badge-available bg-emerald-50 text-emerald-600' : 'badge-busy bg-red-50 text-red-500'}`}>
                                            {d.available ? 'Available' : 'Away'}
                                        </span>
                                        <p className="text-xs text-gray-400 mt-1">{d.city}</p>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* Categories Section */}
            <section className="py-4" aria-labelledby="categories-title">
                <h2 id="categories-title" className="text-xl md:text-2xl font-black text-[#252a67] text-center mb-8">Select Treatment Category</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {(
                        [
                            { t: 'Allopathy', colorClass: 'bg-blue-50 text-blue-600', iconClass: 'fas fa-stethoscope', title: 'Allopathy', desc: 'Modern scientific medicine, verified specialists, and clinical care' },
                            { t: 'Homoeopathy', colorClass: 'bg-emerald-50 text-emerald-600', iconClass: 'fas fa-mortar-pestle', title: 'Homoeopathy', desc: 'Gentle, natural and holistic remedies for chronic & acute ailments' },
                            { t: 'Ayurvedic', colorClass: 'bg-amber-50 text-amber-600', iconClass: 'fas fa-leaf', title: 'Ayurvedic', desc: 'Ancient traditional therapies, panchakarma and herbal medicine' },
                        ] as Array<{ t: Treatment; colorClass: string; iconClass: string; title: string; desc: string }>
                    ).map((c) => (
                        <button
                            key={c.t}
                            type="button"
                            onClick={() => goTreatment(c.t)}
                            aria-label={`Browse ${c.title} doctors`}
                            className="card p-6 rounded-2xl flex flex-col items-center text-center hover:scale-102 hover-lift transition-all bg-white border border-[#252a67]/5 shadow-sm cursor-pointer w-full"
                        >
                            <span className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-4 ${c.colorClass}`}>
                                <i className={c.iconClass} aria-hidden="true" />
                            </span>
                            <h3 className="text-lg font-bold text-[#252a67] mb-1">{c.title}</h3>
                            <p className="text-xs text-gray-500">{c.desc}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Live Active Chambers Section */}
            <section className="py-6 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm" aria-labelledby="active-title">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 id="active-title" className="text-2xl font-black text-[#252a67] flex items-center gap-2">
                            <span className="flex h-3 w-3 relative" aria-hidden="true">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                            </span>
                            Chambers Active Right Now
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">Real-time status of doctors currently sitting in their chambers.</p>
                    </div>
                    <Link href="/doctors" className="font-bold text-sm text-red-500 hover:text-red-600 flex items-center gap-1">
                        See All Doctors <i className="fas fa-arrow-right" aria-hidden="true" />
                    </Link>
                </div>

                {/* Active Chambers Grid */}
                {activeDoctors === null ? (
                    <div className="loading" role="status" aria-live="polite">
                        <div className="spinner" />
                        <span className="sr-only">Loading active chambers…</span>
                    </div>
                ) : activeDoctors.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 font-medium">
                        No active chambers found at this moment.
                    </div>
                ) : (
                    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" role="list">
                        {activeDoctors.map((doc) => (
                            <li
                                key={doc.id}
                                className="card p-5 rounded-2xl flex flex-col justify-between h-full hover-lift bg-white border border-[#252a67]/5 shadow-sm"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <span className="text-[10px] font-bold text-white bg-[#252a67] py-1 px-2.5 rounded-full uppercase tracking-wider">
                                            {doc.treatment}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 py-1 px-2.5 rounded-full flex items-center gap-1">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" aria-hidden="true" />
                                            Live Active
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[#252a67] text-md leading-tight">{doc.fullName}</h3>
                                    <p className="text-xs text-red-500 font-medium mt-0.5">{doc.specialization}</p>
                                    <p className="text-xs text-gray-400 mt-1"><i className="fas fa-map-marker-alt text-gray-300 mr-1" aria-hidden="true" />{doc.city}</p>
                                    <div className="mt-3 bg-gray-50 border border-gray-100 p-2.5 rounded-xl text-xs space-y-1">
                                        <p className="text-gray-600"><i className="far fa-clock text-gray-400 mr-1.5" aria-hidden="true" />{doc.timings}</p>
                                        <p className="text-gray-600"><i className="far fa-calendar-alt text-gray-400 mr-1.5" aria-hidden="true" />{doc.days}</p>
                                        <p className="font-bold text-[#252a67]"><i className="fas fa-ticket-alt text-gray-400 mr-1.5" aria-hidden="true" />Token: {doc.currentToken}/{doc.totalTokens}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.push(`/doctors/${doc.id}`)}
                                    className="mt-4 w-full py-2.5 px-4 text-center text-xs font-bold text-white bg-[#252a67] hover:bg-[#1e2258] rounded-xl transition-colors shadow-sm cursor-pointer"
                                    aria-label={`Book chamber appointment with ${doc.fullName}`}
                                >
                                    Book Chamber
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Platform Value Proposition */}
            <section className="py-8 grid grid-cols-1 md:grid-cols-3 gap-8" aria-label="Platform benefits">
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex-shrink-0 flex items-center justify-center text-red-500 text-xl">
                        <i className="fas fa-clock" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[#252a67] text-lg mb-1">Live Queue Tracking</h3>
                        <p className="text-sm text-gray-600">Track the active patient token numbers live. Reach the chamber exactly when it&apos;s your turn and avoid long waiting room times.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#252a67]/10 flex-shrink-0 flex items-center justify-center text-[#252a67] text-xl">
                        <i className="fas fa-percentage" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[#252a67] text-lg mb-1">Zero Booking Commission</h3>
                        <p className="text-sm text-gray-600">Free, unmediated appointments. You pay directly at the chamber with zero extra platform fees or hidden commission percentages.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex-shrink-0 flex items-center justify-center text-emerald-500 text-xl">
                        <i className="fas fa-check-circle" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-bold text-[#252a67] text-lg mb-1">100% Verified Practitioners</h3>
                        <p className="text-sm text-gray-600">Every single doctor listed is verified with registration number audits. Discover trusted specialists close to home.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
