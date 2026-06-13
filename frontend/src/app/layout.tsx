// Root layout — wires up Poppins, globals.css, and the SessionProvider.
// Server component; only the SessionProvider needs `'use client'`.

import type { Metadata, Viewport } from 'next';
import { Poppins } from 'next/font/google';
import { AuthSessionProvider as SessionProvider } from '@/features/auth/SessionProvider';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-poppins',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'ZEN Doctor — Book trusted doctors near you',
    description:
        'Hyper-local, queue-aware appointment booking for Allopathy, Homoeopathy and Ayurvedic doctors.',
    applicationName: 'ZEN Doctor',
    authors: [{ name: 'ZEN Doctor' }],
    keywords: [
        'doctor booking',
        'West Bengal doctors',
        'Allopathy',
        'Homoeopathy',
        'Ayurvedic',
        'clinic queue',
        'online appointment',
    ],
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-snippet': -1,
            'max-image-preview': 'large',
            'max-video-preview': -1,
        },
    },
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        title: 'ZEN Doctor — Book trusted doctors near you',
        description:
            'Hyper-local, queue-aware appointment booking for Allopathy, Homoeopathy and Ayurvedic doctors.',
        siteName: 'ZEN Doctor',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ZEN Doctor — Book trusted doctors near you',
        description:
            'Hyper-local, queue-aware appointment booking for Allopathy, Homoeopathy and Ayurvedic doctors.',
    },
    icons: {
        icon: '/favicon.ico',
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: '#252a67',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={poppins.variable}>
            <head>
                {/* Preconnect to the Font Awesome CDN so the browser can
                    resolve the TLS handshake in parallel with the CSS request.
                    The `crossOrigin` attribute is required for preconnect
                    hints to actually warm up the TLS+TCP layer. */}
                <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                />
            </head>
            <body className="min-h-screen pt-24">
                {/* `aria-live` polite region so screen readers announce
                    async toast/error messages from anywhere in the app. */}
                <div id="a11y-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-white focus:text-[#252a67] focus:px-4 focus:py-2 focus:rounded-xl focus:shadow-lg focus:font-bold"
                >
                    Skip to main content
                </a>
                <SessionProvider>
                    <Navbar />
                    <main id="main-content">{children}</main>
                    <Footer />
                </SessionProvider>
            </body>
        </html>
    );
}
