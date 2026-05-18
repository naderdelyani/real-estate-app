import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PropertyList } from '@/components/property/PropertyList';
import { MapView } from '@/components/map/MapView';
import { SlidersHorizontal } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Browse Properties',
  description: 'Search and filter thousands of verified real estate listings.',
};

interface SearchParams {
  q?: string;
  type?: string;
  min_price?: string;
  max_price?: string;
  min_area?: string;
  max_area?: string;
  bedrooms?: string;
  city?: string;
  page?: string;
  view?: 'list' | 'map';
}

/** Queries the search service with the current filter params. */
async function searchProperties(params: SearchParams) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && query.set(k, v));
  query.set('limit', '20');

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/search?${query.toString()}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { data: [], total: 0, page: 1, totalPages: 0 };
    return res.json();
  } catch {
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }
}

const PROPERTY_TYPES = ['All', 'Sale', 'Rent'];
const BEDROOM_OPTIONS = ['Any', '1', '2', '3', '4', '5+'];

export default async function PropertiesPage({ searchParams }: { searchParams: SearchParams }) {
  const result = await searchProperties(searchParams);
  const view = searchParams.view ?? 'list';
  const currentPage = Number(searchParams.page ?? 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Filter Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <form className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              name="q"
              defaultValue={searchParams.q}
              placeholder="Search city, neighborhood…"
              className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            {/* Type Filter */}
            <select
              name="type"
              defaultValue={searchParams.type ?? 'All'}
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t === 'All' ? '' : t.toLowerCase()}>{t}</option>
              ))}
            </select>

            {/* Price Range */}
            <input
              name="min_price"
              type="number"
              defaultValue={searchParams.min_price}
              placeholder="Min price"
              className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              name="max_price"
              type="number"
              defaultValue={searchParams.max_price}
              placeholder="Max price"
              className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />

            {/* Bedrooms */}
            <select
              name="bedrooms"
              defaultValue={searchParams.bedrooms ?? ''}
              className="px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {BEDROOM_OPTIONS.map((b) => (
                <option key={b} value={b === 'Any' ? '' : b}>{b === 'Any' ? 'Bedrooms' : `${b} bed`}</option>
              ))}
            </select>

            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
            </button>

            {/* View Toggle */}
            <div className="ml-auto flex rounded-xl border border-gray-300 overflow-hidden">
              {(['list', 'map'] as const).map((v) => (
                <a
                  key={v}
                  href={`?${new URLSearchParams({ ...searchParams, view: v }).toString()}`}
                  className={`px-3 py-2 text-sm capitalize ${view === v ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {v}
                </a>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-sm text-gray-500 mb-6">
          {result.total} {result.total === 1 ? 'property' : 'properties'} found
        </p>

        {view === 'map' ? (
          <MapView properties={result.data} className="h-[70vh] rounded-2xl overflow-hidden" />
        ) : (
          <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">{Array.from({length:6}).map((_,i)=><div key={i} className="h-72 bg-gray-200 rounded-2xl"/>)}</div>}>
            <PropertyList properties={result.data} />
          </Suspense>
        )}

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={`?${new URLSearchParams({ ...searchParams, page: String(p) }).toString()}`}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-primary-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {p}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
