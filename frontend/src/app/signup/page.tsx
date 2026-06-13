'use client';

// Signup page — patient or doctor account.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api';
import { AuthCard } from '@/components/auth/AuthCard';
import type { Role } from '@/types/api';

// `useSearchParams` opt-out of static prerendering for the signup form.
export const dynamic = 'force-dynamic';

function SignupLogo() {
    return (
        <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
                <linearGradient id="sg-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#0e7490" />
                    <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="20" fill="url(#sg-grad)" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#fbbf24" strokeWidth="8" />
            <line x1="50" y1="35" x2="50" y2="65" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
            <line x1="35" y1="50" x2="65" y2="50" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
        </svg>
    );
}

function SignupPageInner() {
    const { signup } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    // `next` is user-controlled via the query string. Refuse any value
    // that isn't a path on this site — otherwise a phishing link such as
    // `/signup?next=https://evil.example.com/login` would silently send
    // post-signup users to the attacker's page.
    const rawNext = searchParams.get('next') || '/';
    const next =
        rawNext.startsWith('/') && !rawNext.startsWith('//')
            ? rawNext
            : '/';

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>('patient');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);
        const errs: string[] = [];
        if (!name || name.trim().length < 2) errs.push('Full name is required.');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.push('Please enter a valid email.');
        if (!password || password.length < 6) errs.push('Password must be at least 6 characters.');
        if (password !== confirmPassword) errs.push('Passwords do not match.');

        setErrors(errs);
        if (errs.length > 0) return;

        setSubmitting(true);
        try {
            const user = await signup(name.trim(), email.trim().toLowerCase(), password, role);
            if (!user) {
                throw new ApiError('Account created but sign-in failed. Please log in manually.', 500);
            }
            router.replace(user.role === 'doctor' ? '/apply' : next);
        } catch (err) {
            const msg =
                err instanceof ApiError
                    ? err.status === 409
                        ? 'An account with that email already exists.'
                        : err.status === 500
                          ? 'Server error. Please make sure the database is running and try again.'
                          : err.message
                    : 'Sign up failed. Please try again.';
            setErrors([msg]);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthCard
            title="Join ZEN Doctor"
            subtitle="Create an account to manage your healthcare booking journey."
            logo={<SignupLogo />}
            surfaceClass="bg-gradient-to-br from-[#0f172a] via-[#0b3b3b] to-[#0e7490]"
            cardClass="bg-white/95 backdrop-blur-sm border border-white/40 shadow-2xl ring-1 ring-black/5"
            footer={
                <>
                    Already have an account?{' '}
                    <Link
                        href={`/login?next=${encodeURIComponent(next)}`}
                        className="text-[#0e7490] font-bold hover:underline"
                    >
                        Login here
                    </Link>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {errors.length > 0 && (
                    <div className="error-banner mb-4" role="alert" aria-live="assertive">
                        {errors.map((e, i) => (
                            <div key={i}>{e}</div>
                        ))}
                    </div>
                )}

                <div>
                    <label htmlFor="su-name" className="block text-xs font-bold text-gray-600 mb-1">
                        Full Name
                    </label>
                    <div className="relative flex items-center">
                        <i className="far fa-user text-gray-400 absolute left-4" aria-hidden="true" />
                        <input
                            id="su-name"
                            type="text"
                            required
                            autoComplete="name"
                            maxLength={100}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#0e7490] rounded-xl w-full text-sm outline-none text-[#0f172a] bg-gray-50 focus:ring-2 focus:ring-[#14b8a6]/30"
                            placeholder="e.g. Rahul Das"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="su-email" className="block text-xs font-bold text-gray-600 mb-1">
                        Email Address
                    </label>
                    <div className="relative flex items-center">
                        <i className="far fa-envelope text-gray-400 absolute left-4" aria-hidden="true" />
                        <input
                            id="su-email"
                            type="email"
                            required
                            autoComplete="email"
                            maxLength={254}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#0e7490] rounded-xl w-full text-sm outline-none text-[#0f172a] bg-gray-50 focus:ring-2 focus:ring-[#14b8a6]/30"
                            placeholder="name@domain.com"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="su-role" className="block text-xs font-bold text-gray-600 mb-1">
                        Account Purpose
                    </label>
                    <select
                        id="su-role"
                        required
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
                        className="py-2.5 px-3 border border-gray-200 focus:border-[#0e7490] rounded-xl w-full text-sm outline-none text-[#0f172a] bg-gray-50 cursor-pointer focus:ring-2 focus:ring-[#14b8a6]/30"
                    >
                        <option value="patient">I want to book appointments (Patient)</option>
                        <option value="doctor">I want to list my chamber (Chamber Owner)</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="su-password" className="block text-xs font-bold text-gray-600 mb-1">
                        Create Password
                    </label>
                    <div className="relative flex items-center">
                        <i className="fas fa-lock text-gray-400 absolute left-4" aria-hidden="true" />
                        <input
                            id="su-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            minLength={6}
                            maxLength={200}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#0e7490] rounded-xl w-full text-sm outline-none text-[#0f172a] bg-gray-50 focus:ring-2 focus:ring-[#14b8a6]/30"
                            placeholder="Min. 6 characters"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="su-confirm-password" className="block text-xs font-bold text-gray-600 mb-1">
                        Confirm Password
                    </label>
                    <div className="relative flex items-center">
                        <i className="fas fa-check-double text-gray-400 absolute left-4" aria-hidden="true" />
                        <input
                            id="su-confirm-password"
                            type="password"
                            required
                            autoComplete="new-password"
                            maxLength={200}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#0e7490] rounded-xl w-full text-sm outline-none text-[#0f172a] bg-gray-50 focus:ring-2 focus:ring-[#14b8a6]/30"
                            placeholder="Re-enter password"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 font-bold text-xs text-white bg-gradient-to-r from-[#0e7490] to-[#14b8a6] hover:from-[#0c647e] hover:to-[#0d9488] rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#14b8a6]/50"
                >
                    {submitting ? 'Creating account…' : 'Register Account'}
                </button>
            </form>
        </AuthCard>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
            <SignupPageInner />
        </Suspense>
    );
}
