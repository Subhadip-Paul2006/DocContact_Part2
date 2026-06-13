'use client';

// Login page — credentials sign-in via Auth.js.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError } from '@/lib/api';
import { AuthCard } from '@/components/auth/AuthCard';
import type { Role } from '@/types/api';

// `useSearchParams` opt-out of static prerendering for the login form.
export const dynamic = 'force-dynamic';

function LoginLogo() {
    return (
        <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
            <rect width="100" height="100" rx="20" fill="#252a67" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#ef4444" strokeWidth="8" />
            <line x1="50" y1="35" x2="50" y2="65" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
            <line x1="35" y1="50" x2="65" y2="50" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
        </svg>
    );
}

function LoginPageInner() {
    const { login, logout } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    // `next` can be supplied as a query param by middleware so a deep
    // link to /tracker, /apply etc. can be rehydrated after login. It must
    // be a same-origin, path-only URL — anything else (a full URL pointing
    // at a foreign host) would let an attacker craft a phishing link such
    // as `/login?next=https://evil.example.com/steal-creds`. Strip the
    // dangerous shapes before using it.
    const rawNext = searchParams.get('next') || '/';
    const next =
        rawNext.startsWith('/') && !rawNext.startsWith('//')
            ? rawNext
            : '/';

    const [roleTab, setRoleTab] = useState<Role>('patient');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors([]);
        const errs: string[] = [];
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.push('Please enter a valid email.');
        if (!password) errs.push('Password is required.');
        setErrors(errs);
        if (errs.length > 0) return;

        setSubmitting(true);
        try {
            const loggedInUser = await login(email.trim().toLowerCase(), password);
            if (loggedInUser.role !== roleTab) {
                // Session mismatch with selected tab. Log out to keep state clean.
                await logout();
                setErrors([
                    `Account matches ${
                        loggedInUser.role === 'patient' ? 'Patient' : 'Chamber Owner'
                    } role. Please toggle the login tab above.`
                ]);
            } else {
                router.replace(next);
            }
        } catch (err) {
            const msg =
                err instanceof ApiError
                    ? err.status === 401
                        ? 'Email or password is incorrect.'
                        : err.message
                    : 'Login failed. Please try again.';
            setErrors([msg]);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthCard
            title="Welcome Back"
            subtitle="Access your doctor booking queue and listings."
            logo={<LoginLogo />}
            surfaceClass="bg-[#fffff0]"
            cardClass="bg-white"
            footer={
                <>
                    Don&apos;t have an account?{' '}
                    <Link
                        href={`/signup?next=${encodeURIComponent(next)}`}
                        className="text-red-500 font-bold hover:underline"
                    >
                        Sign up here
                    </Link>
                </>
            }
        >
            {/* Role Selector Tabs — rendered as a radiogroup so screen
                readers announce "tab 1 of 2" and arrow keys work. */}
            <div
                className="grid grid-cols-2 gap-2 border border-gray-100 bg-gray-50/50 p-1.5 rounded-2xl mb-6"
                role="radiogroup"
                aria-label="Account type"
            >
                <button
                    type="button"
                    role="radio"
                    aria-checked={roleTab === 'patient'}
                    onClick={() => {
                        setRoleTab('patient');
                        setErrors([]);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        roleTab === 'patient'
                            ? 'text-[#252a67] bg-white shadow-sm border border-gray-100'
                            : 'text-gray-400 hover:text-[#252a67]'
                    }`}
                >
                    Patient Account
                </button>
                <button
                    type="button"
                    role="radio"
                    aria-checked={roleTab === 'doctor'}
                    onClick={() => {
                        setRoleTab('doctor');
                        setErrors([]);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        roleTab === 'doctor'
                            ? 'text-[#252a67] bg-white shadow-sm border border-gray-100'
                            : 'text-gray-400 hover:text-[#252a67]'
                    }`}
                >
                    Chamber Owner
                </button>
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
                    <label htmlFor="login-email" className="block text-xs font-bold text-gray-600 mb-1">
                        Email Address
                    </label>
                    <div className="relative flex items-center">
                        <i className="far fa-envelope text-gray-400 absolute left-4" aria-hidden="true" />
                        <input
                            id="login-email"
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
                    <label htmlFor="login-password" className="block text-xs font-bold text-gray-600 mb-1">
                        Password
                    </label>
                    <div className="relative flex items-center">
                        <i className="fas fa-lock text-gray-400 absolute left-4" aria-hidden="true" />
                        <input
                            id="login-password"
                            type="password"
                            required
                            autoComplete="current-password"
                            maxLength={200}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-11 pr-4 py-2.5 border border-gray-200 focus:border-[#252a67] rounded-xl w-full text-sm outline-none text-[#252a67] bg-gray-50"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 font-bold text-xs text-white bg-[#252a67] hover:bg-[#1e2258] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#252a67]/40"
                >
                    {submitting ? 'Signing in…' : 'Login to Portal'}
                </button>
            </form>

            {/* Note: the previous version of this page rendered a "Test
                Credentials" block with real-looking credentials in
                production. Hard-coded credentials in the HTML are a
                well-known foothold for credential-stuffing and brute
                force attacks. We render a neutral, non-actionable hint
                instead; if you need to test locally, use the seed
                accounts the README documents, not anything shipped in
                the client bundle. */}
            <div className="mt-8 border-t border-gray-100 pt-6">
                <p className="text-[10px] text-gray-400 text-center">
                    Trouble signing in? Use the{' '}
                    <Link href="/about" className="underline">contact options</Link> on the About page.
                </p>
            </div>
        </AuthCard>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
            <LoginPageInner />
        </Suspense>
    );
}
