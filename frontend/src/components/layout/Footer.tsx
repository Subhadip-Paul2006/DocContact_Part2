import Link from 'next/link';

export function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="bg-[#0b0f33] text-white mt-16 py-12 px-6 border-t border-white/5">
            <div className="max-w-[88rem] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center">
                        <svg width="35" height="35" viewBox="0 0 100 100" className="mr-2" aria-hidden="true" focusable="false">
                            <rect width="100" height="100" rx="20" fill="#252a67" />
                            <circle cx="50" cy="50" r="30" fill="none" stroke="#ef4444" strokeWidth="8" />
                            <line x1="50" y1="35" x2="50" y2="65" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                            <line x1="35" y1="50" x2="65" y2="50" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
                        </svg>
                        <span className="text-lg font-black tracking-tight text-white">ZEN DOCTOR</span>
                    </div>
                    <p className="text-xs text-gray-400">
                        West Bengal&apos;s premier hyper-local verified doctor discovery and real-time appointment booking system.
                    </p>
                    <div className="flex gap-3 text-lg text-gray-400">
                        {/* Empty `href="#"` previously caused scroll-to-top and
                            gave screen readers nothing meaningful to announce.
                            Use a `mailto:` for any contact (last resort) and
                            suppress until a real social profile exists. We
                            render them as inert buttons so they cannot trigger
                            navigation or open a tab to nowhere. */}
                        <button
                            type="button"
                            disabled
                            aria-label="Facebook (coming soon)"
                            title="Facebook — coming soon"
                            className="opacity-40 cursor-not-allowed"
                        >
                            <i className="fab fa-facebook" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            disabled
                            aria-label="Twitter (coming soon)"
                            title="Twitter — coming soon"
                            className="opacity-40 cursor-not-allowed"
                        >
                            <i className="fab fa-twitter" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            disabled
                            aria-label="Instagram (coming soon)"
                            title="Instagram — coming soon"
                            className="opacity-40 cursor-not-allowed"
                        >
                            <i className="fab fa-instagram" aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-md text-white mb-4">Treatment Category</h4>
                    <ul className="space-y-2 text-xs text-gray-400">
                        <li><Link href="/doctors?category=Allopathy" className="hover:text-white">Allopathy Doctors</Link></li>
                        <li><Link href="/doctors?category=Homoeopathy" className="hover:text-white">Homoeopathy Doctors</Link></li>
                        <li><Link href="/doctors?category=Ayurvedic" className="hover:text-white">Ayurvedic Doctors</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-md text-white mb-4">Quick Links</h4>
                    <ul className="space-y-2 text-xs text-gray-400">
                        <li><Link href="/doctors" className="hover:text-white">Find Active Chambers</Link></li>
                        <li><Link href="/apply" className="hover:text-white">Doctor Listing Application</Link></li>
                        <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-md text-white mb-4">Legal Info</h4>
                    <ul className="space-y-2 text-xs text-gray-400 text-justify">
                        <li>Disclaimer: Information on doctors is verified but users must perform final due diligence.</li>
                        <li className="mt-2">&copy; {year} Zen Doctor clone project. Inspired by original.</li>
                    </ul>
                </div>
            </div>
        </footer>
    );
}
