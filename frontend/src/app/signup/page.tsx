'use client';

// Signup page — patient or doctor account.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api';
import type { Role } from '@/types/api';

// `useSearchParams` opt-out of static prerendering for the signup form.
export const dynamic = 'force-dynamic';

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
            router.replace(user.role === 'doctor' ? '/apply' : next);
        } catch (err) {
            const msg =
                err instanceof ApiError
                    ? err.status === 409
                        ? 'An account with that email already exists.'
                        : err.message
                    : 'Sign up failed. Please try again.';
            setErrors([msg]);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-[calc(100vh-64px)] bg-[#fffff0] flex items-center justify-center p-4 pt-12 pb-12 fade-in">
            <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-6 lg:p-8 shadow-xl">
                <div className="text-center mb-6">
                    <div className="flex justify-center items-center mb-3">
                        <svg width="40" height="40" viewBox="0 0 100 100">
                            <rect width="100" height="100" rx="20" fill="#252a67"/>
                            <circle cx="50" cy="50" r="30" fill="none" stroke="#ef4444" strokeWidth="8"/>
                            <line x1="50" y1="35" x2="50" y2="65" stroke="#ffffff" strokeWidth="8" strokeLinecap="round"/>
                            <line x1="35" y1="50" x2="65" y2="50" stroke="#ffffff" strokeWidth="8" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-black text-[#252a67]">Join ZEN Doctor</h1>
                    <p className="text-xs text-gray-500 mt-1">Create an account to manage your healthcare booking journey.</p>
                </div>

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
                                className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
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
                                className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
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
                            className="py-2.5 px-3 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50 cursor-pointer"
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
                                className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
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
                                className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
                                placeholder="Re-enter password"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 px-4 font-bold text-xs text-white bg-[#252a67] hover:bg-[#1e2258] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#252a67]/40"
                    >
                        {submitting ? 'Creating account…' : 'Register Account'}
                    </button>
                </form>

                {/* Redirect links */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link
                        href={`/login?next=${encodeURIComponent(next)}`}
                        className="text-red-500 font-bold hover:underline"
                    >
                        Login here
                    </Link>
                </p>
            </div>
        </main>
    );
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
            <SignupPageInner />
        </Suspense>
    );
}
