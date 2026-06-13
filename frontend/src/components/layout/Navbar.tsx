'use client';

// Top navbar — uses `useAuth()` for session state.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';

export function Navbar() {
    const { user, ready, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const sidebarRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);

    const handleLogout = async () => {
        await logout();
        router.push('/');
        closeMobile();
    };

    const openMobile = () => setMobileOpen(true);
    const closeMobile = () => setMobileOpen(false);

    // Close the mobile sidebar on route change so it doesn't linger over
    // the new page (also avoids focus being trapped on a hidden menu).
    // The `pathname` change is the external trigger; we reset the open
    // flag in response. We defer the close via queueMicrotask so the
    // effect body itself doesn't synchronously call setState.
    useEffect(() => {
        if (mobileOpen) {
            queueMicrotask(() => setMobileOpen(false));
        }
        // mobileOpen intentionally not in deps — we only react to pathname.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    // Escape key + focus management + body scroll lock while sidebar is open.
    useEffect(() => {
        if (!mobileOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeMobile();
                // Restore focus to the trigger that opened the menu.
                triggerRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        // Move focus into the sidebar so keyboard users land somewhere
        // sensible. After 50ms so the transition has started.
        const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
        // Lock background scroll to avoid a content-jump behind the drawer.
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            clearTimeout(t);
            document.body.style.overflow = previousOverflow;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mobileOpen]);

    return (
        <>
            {/* Navbar Component */}
            <nav
                aria-label="Primary"
                className="fixed top-0 left-0 w-full px-4 pt-4 pb-2 bg-[#fffff0]/85 backdrop-blur-md z-[100] border-b border-[#252a67]/5"
            >
                <div className="max-w-[88rem] mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Left Side Logo */}
                    <Link href="/" className="flex items-center cursor-pointer" onClick={closeMobile} aria-label="ZEN Doctor home">
                        {/* Sleek custom SVG logo */}
                        <svg width="40" height="40" viewBox="0 0 100 100" className="mr-2" aria-hidden="true" focusable="false">
                            <rect width="100" height="100" rx="20" fill="#252a67" />
                            <circle cx="50" cy="50" r="30" fill="none" stroke="#ef4444" strokeWidth="8" />
                            <line x1="50" y1="35" x2="50" y2="65" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                            <line x1="35" y1="50" x2="65" y2="50" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                        </svg>
                        <span className="flex flex-col">
                            <span className="text-xl font-extrabold text-[#252a67] tracking-tight leading-none">ZEN</span>
                            <span className="text-xs font-bold text-red-500 tracking-widest leading-none mt-0.5">DOCTOR</span>
                        </span>
                    </Link>

                    {/* Desktop Links */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/doctors" className="px-4 py-3 font-bold rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm shadow-red-200">
                            Available Doctors
                        </Link>
                        <Link href="/apply" className="px-4 py-3 font-bold rounded-2xl bg-[#252a67] text-white hover:bg-[#1e2258] transition-colors">
                            Apply for Listing
                        </Link>
                        {ready && user ? (
                            <div className="flex items-center gap-4">
                                <Link href="/tracker" className="font-bold text-[#252a67] hover:underline text-sm flex items-center gap-1">
                                    <i className="fas fa-bookmark" aria-hidden="true" /> My Bookings
                                </Link>
                                <span className="text-sm font-bold text-gray-700 bg-gray-100 py-1.5 px-3 rounded-full" aria-label={`Signed in as ${user.name}`}>
                                    Hi, {user.name.split(' ')[0]}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="px-4 py-2 border border-[#252a67] text-[#252a67] font-bold rounded-2xl hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : ready ? (
                            <div className="flex items-center gap-4">
                                <Link href="/login" className="px-5 py-3 font-bold rounded-2xl bg-white text-[#252a67] border border-[#252a67] hover:bg-gray-50 transition-colors">
                                    Login
                                </Link>
                                <Link href="/signup" className="px-5 py-3 font-bold rounded-2xl bg-white text-[#252a67] border border-[#252a67] hover:bg-gray-50 transition-colors">
                                    Signup
                                </Link>
                            </div>
                        ) : null}
                    </div>

                    {/* Mobile Menu Trigger */}
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={openMobile}
                        className="md:hidden text-3xl text-[#252a67] font-bold focus:outline-none cursor-pointer"
                        aria-label="Open navigation menu"
                        aria-expanded={mobileOpen}
                        aria-controls="mobile-sidebar"
                    >
                        <span aria-hidden="true">☰</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Sidebar overlay — clickable to close. The button is
                explicit so assistive tech announces it as a control. */}
            <button
                type="button"
                onClick={closeMobile}
                tabIndex={mobileOpen ? 0 : -1}
                aria-label="Close navigation menu"
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[101] transition-opacity duration-300 border-0 p-0 cursor-default ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            />

            {/* Mobile Sidebar */}
            <div
                ref={sidebarRef}
                id="mobile-sidebar"
                role="dialog"
                aria-modal="true"
                aria-label="Mobile navigation"
                aria-hidden={!mobileOpen}
                className={`fixed top-0 right-0 w-72 h-full bg-gradient-to-br from-[#0b0f33] to-[#252a67] text-white shadow-2xl z-[102] transition-transform duration-300 transform ${mobileOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}
            >
                {/* Close Button */}
                <div className="p-6 flex items-center justify-between bg-white border-b border-gray-100">
                    <Link href="/" className="flex items-center cursor-pointer" onClick={closeMobile} aria-label="ZEN Doctor home">
                        <svg width="30" height="30" viewBox="0 0 100 100" className="mr-2" aria-hidden="true" focusable="false">
                            <rect width="100" height="100" rx="20" fill="#252a67" />
                            <circle cx="50" cy="50" r="30" fill="none" stroke="#ef4444" strokeWidth="8" />
                            <line x1="50" y1="35" x2="50" y2="65" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                            <line x1="35" y1="50" x2="65" y2="50" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                        </svg>
                        <span className="text-md font-extrabold text-[#252a67]">ZEN DOCTOR</span>
                    </Link>
                    <button
                        ref={closeBtnRef}
                        type="button"
                        onClick={closeMobile}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
                        aria-label="Close menu"
                    >
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                </div>

                {/* Links Body */}
                <div className="flex-grow overflow-y-auto px-6 py-8 space-y-6">
                    <div className="space-y-3">
                        <Link href="/doctors" onClick={closeMobile} className="flex items-center justify-center gap-2 w-full py-3 px-4 text-white font-bold bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl shadow-lg">
                            <i className="fas fa-user-md" aria-hidden="true" /> Available Doctors
                        </Link>
                        <Link href="/apply" onClick={closeMobile} className="flex items-center justify-center gap-2 w-full py-3 px-4 text-[#252a67] font-bold bg-white rounded-2xl shadow-sm hover:bg-gray-50">
                            <i className="fas fa-plus-circle" aria-hidden="true" /> Apply for Listing
                        </Link>
                    </div>

                    {/* Dynamic Auth Links */}
                    {ready && (
                        <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                            {user ? (
                                <div className="flex flex-col gap-3">
                                    <span className="text-xs text-gray-300">Logged in as: <strong className="text-white">{user.name}</strong></span>
                                    <Link href="/tracker" onClick={closeMobile} className="flex items-center gap-2 py-2 px-3 hover:bg-white/10 rounded-xl text-sm font-semibold transition-all">
                                        <i className="fas fa-bookmark text-blue-400" aria-hidden="true" /> My Bookings
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-red-500/20 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold text-center cursor-pointer"
                                    >
                                        <i className="fas fa-sign-out-alt" aria-hidden="true" /> Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <Link href="/login" onClick={closeMobile} className="flex items-center justify-center gap-1.5 py-3 hover:bg-white/10 rounded-xl border border-white/20 transition-all text-xs font-bold text-center text-white">
                                        <i className="fas fa-sign-in-alt text-blue-400" aria-hidden="true" /> Login
                                    </Link>
                                    <Link href="/signup" onClick={closeMobile} className="flex items-center justify-center gap-1.5 py-3 hover:bg-white/10 rounded-xl border border-white/20 transition-all text-xs font-bold text-center text-white">
                                        <i className="fas fa-user-plus text-emerald-400" aria-hidden="true" /> Signup
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Categories */}
                    <nav aria-label="Treatment categories" className="space-y-3">
                        <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Treatment Categories</p>
                        <div className="space-y-1">
                            <Link href="/doctors?category=Allopathy" onClick={closeMobile} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-xl text-sm text-gray-300 hover:text-white font-medium">
                                <span>Allopathy</span> <i className="fas fa-chevron-right text-xs opacity-50" aria-hidden="true" />
                            </Link>
                            <Link href="/doctors?category=Homoeopathy" onClick={closeMobile} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-xl text-sm text-gray-300 hover:text-white font-medium">
                                <span>Homoeopathy</span> <i className="fas fa-chevron-right text-xs opacity-50" aria-hidden="true" />
                            </Link>
                            <Link href="/doctors?category=Ayurvedic" onClick={closeMobile} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-xl text-sm text-gray-300 hover:text-white font-medium">
                                <span>Ayurvedic</span> <i className="fas fa-chevron-right text-xs opacity-50" aria-hidden="true" />
                            </Link>
                        </div>
                    </nav>

                    {/* Info Links */}
                    <nav aria-label="Information" className="space-y-3">
                        <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Information</p>
                        <div className="space-y-1">
                            <Link href="/about" onClick={closeMobile} className="flex items-center justify-between py-2 px-3 hover:bg-white/5 rounded-xl text-sm text-gray-300 hover:text-white font-medium">
                                <span>About Us</span> <i className="fas fa-chevron-right text-xs opacity-50" aria-hidden="true" />
                            </Link>
                        </div>
                    </nav>
                </div>

                {/* Brand Footer inside Sidebar */}
                <div className="p-6 border-t border-white/10 bg-[#16193f] flex flex-col items-center">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Clone Developed by Antigravity</span>
                    <span className="text-xs font-extrabold text-white flex items-center gap-1"><i className="fas fa-shield-alt text-red-500" aria-hidden="true" /> ZEN DOCTOR</span>
                </div>
            </div>
        </>
    );
}
