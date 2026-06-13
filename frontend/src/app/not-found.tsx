'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();
    useEffect(() => {
        // Soft client-side redirect — keeps the URL valid for SSR.
        // Skip if the user has prefers-reduced-motion so we don't blow away
        // their current focus context for a 1.5s timer they didn't ask for.
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            router.replace('/');
            return;
        }
        const t = setTimeout(() => router.replace('/'), 1500);
        return () => clearTimeout(t);
    }, [router]);
    return (
        <div className="container fade-in" style={{ padding: '3rem 0', textAlign: 'center' }} role="alert">
            <h1 className="text-2xl">Page not found</h1>
            <p className="text-muted">Redirecting to the home page…</p>
            <p>
                <Link
                    href="/"
                    className="text-[#252a67] font-bold underline mt-2 inline-block"
                >
                    Go now
                </Link>
            </p>
        </div>
    );
}
