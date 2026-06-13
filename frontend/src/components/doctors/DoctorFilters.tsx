// Filters for the doctors list — search + treatment + city + active toggle.

import type { Treatment } from '@/types/api';

interface Props {
    search: string;
    treatment: Treatment | '';
    city: string;
    cities: string[];
    activeOnly: boolean;
    onChange: (next: {
        search?: string;
        treatment?: Treatment | '';
        city?: string;
        activeOnly?: boolean;
    }) => void;
}

const TREATMENTS: Treatment[] = ['Allopathy', 'Homoeopathy', 'Ayurvedic'];

export function DoctorFilters({ search, treatment, city, cities, activeOnly, onChange }: Props) {
    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col lg:flex-row gap-4 items-end mb-6">
            {/* Text Search */}
            <div className="flex-grow relative w-full">
                <label htmlFor="doc-search" className="block text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
                    Search Name or Specialty
                </label>
                <div className="relative flex items-center">
                    <i className="fas fa-search text-gray-400 absolute left-4"></i>
                    <input
                        id="doc-search"
                        type="text"
                        placeholder="Type doctor name, degree, specialty..."
                        value={search}
                        onChange={(e) => onChange({ search: e.target.value })}
                        className="pl-11 pr-4 py-3 border border-gray-200 focus:border-[#252a67] rounded-2xl w-full text-sm outline-none text-[#252a67] transition-all bg-gray-50"
                    />
                </div>
            </div>

            {/* Treatment Type Filter */}
            <div className="w-full lg:w-64">
                <label htmlFor="doc-treatment" className="block text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
                    Treatment Category
                </label>
                <select
                    id="doc-treatment"
                    value={treatment}
                    onChange={(e) => onChange({ treatment: e.target.value as Treatment | '' })}
                    className="w-full py-3 px-4 border border-gray-200 focus:border-[#252a67] rounded-2xl text-sm outline-none text-[#252a67] transition-all bg-gray-50 cursor-pointer"
                >
                    <option value="">All Categories</option>
                    {TREATMENTS.map((t) => (
                        <option key={t} value={t}>
                            {t}
                        </option>
                    ))}
                </select>
            </div>

            {/* City Filter */}
            <div className="w-full lg:w-64">
                <label htmlFor="doc-city" className="block text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">
                    Select Location
                </label>
                <select
                    id="doc-city"
                    value={city}
                    onChange={(e) => onChange({ city: e.target.value })}
                    className="w-full py-3 px-4 border border-gray-200 focus:border-[#252a67] rounded-2xl text-sm outline-none text-[#252a67] transition-all bg-gray-50 cursor-pointer"
                >
                    <option value="">All Locations</option>
                    {cities.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>
            </div>

            {/* Active Toggle */}
            <div className="w-full lg:w-auto flex items-center justify-start lg:justify-end pb-3 lg:pb-0 h-11">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm font-semibold text-[#252a67]">
                    <input
                        type="checkbox"
                        checked={activeOnly}
                        onChange={(e) => onChange({ activeOnly: e.target.checked })}
                        className="w-4 h-4 rounded text-red-500 focus:ring-red-400 border-gray-300 cursor-pointer"
                    />
                    <span>Available only</span>
                </label>
            </div>
        </div>
    );
}
