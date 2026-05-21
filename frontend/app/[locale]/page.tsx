import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Suspense } from 'react';
import { PropertyList } from '@/components/property/PropertyList';
import { Button } from '@/components/ui/Button';
import { Search, MapPin, TrendingUp, Shield } from 'lucide-react';

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

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const [featuredProperties, t] = await Promise.all([
    getFeaturedProperties(),
    getTranslations({ locale, namespace: 'home' }),
  ]);

  const STATS = [
    { label: t('stats.activeListings'),  value: '12,000+' },
    { label: t('stats.citiesCovered'),   value: '50+' },
    { label: t('stats.happyClients'),    value: '8,500+' },
    { label: t('stats.expertAgents'),    value: '300+' },
  ];

  const FEATURES = [
    { icon: Search,     title: t('features.smartSearch.title'),       description: t('features.smartSearch.description') },
    { icon: MapPin,     title: t('features.interactiveMap.title'),    description: t('features.interactiveMap.description') },
    { icon: TrendingUp, title: t('features.marketInsights.title'),    description: t('features.marketInsights.description') },
    { icon: Shield,     title: t('features.verifiedListings.title'),  description: t('features.verifiedListings.description') },
  ];

  const QUICK_FILTERS = [
    { label: t('quickFilters.forSale'),    href: '/properties?type=sale' },
    { label: t('quickFilters.forRent'),    href: '/properties?type=rent' },
    { label: t('quickFilters.apartments'), href: '/properties?property_type=apartment' },
    { label: t('quickFilters.houses'),     href: '/properties?property_type=house' },
    { label: t('quickFilters.newBuilds'),  href: '/properties?sort=createdAt:desc' },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 py-24 text-white">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {t('hero.title')}
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-primary-100">
            {t('hero.subtitle')}
          </p>

          <div className="mt-10 mx-auto max-w-3xl">
            <div className="flex flex-col sm:flex-row gap-2 bg-white rounded-2xl p-2 shadow-2xl">
              <div className="relative flex-1">
                <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('hero.searchPlaceholder')}
                  className="w-full ps-10 pe-4 py-3 text-gray-900 bg-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <Link href="/properties">
                <Button size="lg" className="w-full sm:w-auto">
                  <Search className="me-2 h-5 w-5" />
                  {t('hero.search')}
                </Button>
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {QUICK_FILTERS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur rounded-full text-sm font-medium transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
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
            <h2 className="text-2xl font-bold text-gray-900">{t('latestListings.title')}</h2>
            <p className="mt-1 text-gray-500">{t('latestListings.subtitle')}</p>
          </div>
          <Link href="/properties">
            <Button variant="outline">{t('latestListings.viewAll')}</Button>
          </Link>
        </div>
        <Suspense fallback={<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">{Array.from({length:6}).map((_,i)=><div key={i} className="h-72 bg-gray-200 rounded-2xl"/>)}</div>}>
          <PropertyList properties={featuredProperties} />
        </Suspense>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">{t('features.title')}</h2>
            <p className="mt-2 text-gray-500">{t('features.subtitle')}</p>
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
