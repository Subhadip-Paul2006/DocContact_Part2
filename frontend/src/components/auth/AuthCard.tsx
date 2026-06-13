// AuthCard — shared chrome for the login + signup pages.
// Pure presentational. The two pages have different page-level
// background classes (login uses a flat cream, signup uses a teal
// gradient) and different card surface classes (login is plain
// white, signup is translucent over the gradient), so both are
// passed in as Tailwind class strings instead of being inferred.
// The logo SVG is also a `ReactNode` because the two pages ship
// different logo variants.

import type { ReactNode } from 'react';

interface Props {
    title: string;
    subtitle?: string;
    logo: ReactNode;
    surfaceClass: string;
    cardClass: string;
    children: ReactNode;
    footer: ReactNode;
}

export function AuthCard({ title, subtitle, logo, surfaceClass, cardClass, children, footer }: Props) {
    return (
        <main className={`min-h-[calc(100vh-64px)] ${surfaceClass} flex items-center justify-center p-4 pt-12 pb-12 fade-in`}>
            <div className={`w-full max-w-md ${cardClass} border border-gray-100 rounded-3xl p-6 lg:p-8 shadow-xl`}>
                <div className="text-center mb-6">
                    <div className="flex justify-center items-center mb-3">{logo}</div>
                    <h1 className="text-2xl font-black text-[#252a67]">{title}</h1>
                    {subtitle ? <p className="text-xs text-gray-500 mt-1">{subtitle}</p> : null}
                </div>
                {children}
                <div className="text-center text-xs text-gray-500 mt-6">{footer}</div>
            </div>
        </main>
    );
}
