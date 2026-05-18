import Link from 'next/link';
import { Suspense } from 'react';
import { PropertyList } from '@/components/property/PropertyList';
import { Button } from '@/components/ui/Button';
import { Search, MapPin, TrendingUp, Shield } from 'lucide-react';

/** Fetches featured/latest properties from the property service. */
async function getFeaturedProperties() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/properties?limit=6&sort=createdAt:desc`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

const STATS = [
  { label: 'Active Listings', value: '12,000+' },
  { label: 'Cities Covered', value: '50+' },
  { label: 'Happy Clients', value: '8,500+' },
  { label: 'Expert Agents', value: '300+' },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Filter by price, area, location, and dozens of other criteria to find the perfect property.',
  },
  {
    icon: MapPin,
    title: 'Interactive Map',
    description: 'Browse listings on a live map and explore neighborhoods before you visit.',
  },
  {
    icon: TrendingUp,
    title: 'Market Insights',
    description: 'Access real-time pricing trends and market analytics for any area.',
  },
  {
    icon: Shield,
    title: 'Verified Listings',
    description: 'Every listing is verified by our team to ensure accuracy and legitimacy.',
  },
];

export default async function HomePage() {
  const featuredProperties = await getFeaturedProperties();

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 py-24 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find Your Dream Property
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-primary-100">
            Search thousands of verified listings — apartments, houses, villas, and commercial spaces
            across the country.
          </p>

          {/* Search Bar */}
          <div className="mt-10 mx-auto max-w-3xl">
            <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-2xl">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="City, neighborhood, or address…"
                  className="w-full pl-10 pr-4 py-3 text-gray-900 bg-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Link href="/properties">
                <Button size="lg" className="w-full sm:w-auto">
                  <Search className="mr-2 h-5 w-5" />
                  Search
                </Button>
              </Link>
            </div>

            {/* Quick filters */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['For Sale', 'For Rent', 'Apartments', 'Houses', 'New Builds'].map((tag) => (
                <Link
                  key={tag}
                  href={`/properties?type=${tag.toLowerCase().replace(' ', '-')}`}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full text-sm font-medium transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map(({ label, value }) => (
              <div key={label} className="text-center">
                <dt className="text-sm font-medium text-gray-500">{label}</dt>
                <dd className="mt-1 text-3xl font-bold text-primary-600">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Latest Listings</h2>
            <p className="mt-1 text-gray-500">Fresh properties added this week</p>
          </div>
          <Link href="/properties">
            <Button variant="outline">View all listings</Button>
          </Link>
        </div>
        <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">{Array.from({length:6}).map((_,i)=><div key={i} className="h-72 bg-gray-200 rounded-2xl"/>)}</div>}>
          <PropertyList properties={featuredProperties} />
        </Suspense>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">Why Choose Us</h2>
            <p className="mt-2 text-gray-500">Everything you need to find, buy, or rent a property</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm text-gray-500">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
