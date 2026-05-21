import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { MapView } from '@/components/map/MapView';
import { Button } from '@/components/ui/Button';
import { Bed, Bath, Maximize2, MapPin, Calendar, Heart, Share2 } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: 'sale' | 'rent';
  status: 'available' | 'sold' | 'rented';
  bedrooms: number;
  bathrooms: number;
  area: number;
  address: string;
  city: string;
  lat: number;
  lng: number;
  images: { id: string; url: string; alt: string }[];
  agent: { name: string; phone: string; avatar: string };
  createdAt: string;
}

type Props = { params: { locale: string; id: string } };

async function getProperty(id: string): Promise<Property | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/properties/${id}`, {
      next: { revalidate: 30 },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params: { locale, id } }: Props): Promise<Metadata> {
  const property = await getProperty(id);
  if (!property) {
    const t = await getTranslations({ locale, namespace: 'propertyDetail' });
    return { title: t('notFound') };
  }
  return {
    title: property.title,
    description: property.description.slice(0, 160),
    openGraph: { images: property.images[0]?.url ? [property.images[0].url] : [] },
  };
}

function formatPrice(price: number, type: 'sale' | 'rent', locale: string): string {
  const formatted = price.toLocaleString(locale === 'fa' ? 'fa-IR' : 'en-US');
  return type === 'rent' ? `$${formatted}/mo` : `$${formatted}`;
}

export default async function PropertyDetailPage({ params: { locale, id } }: Props) {
  const [property, t] = await Promise.all([
    getProperty(id),
    getTranslations({ locale, namespace: 'propertyDetail' }),
  ]);

  if (!property) notFound();

  const mapProperties = [{ id: property.id, lat: property.lat, lng: property.lng, title: property.title, price: property.price }];

  const statusKey = property.status as 'available' | 'sold' | 'rented';
  const typeKey = property.type === 'sale' ? 'forSale' : 'forRent';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Image Gallery */}
      <div className="bg-black">
        <div className="mx-auto max-w-7xl relative h-96 lg:h-[500px]">
          {property.images[0] && (
            <Image
              src={property.images[0].url}
              alt={property.images[0].alt ?? property.title}
              fill
              className="object-cover opacity-90"
              priority
            />
          )}
          <div className="absolute bottom-4 end-4 flex gap-2">
            <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur">
              <Share2 className="h-4 w-4 me-1" /> {t('share')}
            </Button>
            <Button variant="outline" size="sm" className="bg-white/90 backdrop-blur">
              <Heart className="h-4 w-4 me-1" /> {t('save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                  property.type === 'sale' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {t(typeKey)}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  property.status === 'available' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-600'
                }`}>
                  {t(statusKey)}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
              <p className="mt-2 flex items-center gap-1 text-gray-500">
                <MapPin className="h-4 w-4" />
                {property.address}, {property.city}
              </p>
              <p className="mt-3 text-3xl font-bold text-primary-600">
                {formatPrice(property.price, property.type, locale)}
              </p>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Bed,       value: t('beds',  { count: property.bedrooms }) },
                { icon: Bath,      value: t('baths', { count: property.bathrooms }) },
                { icon: Maximize2, value: t('area',  { value: property.area }) },
              ].map(({ icon: Icon, value }) => (
                <div key={value} className="flex flex-col items-center justify-center gap-1 p-4 bg-white rounded-2xl shadow-card">
                  <Icon className="h-6 w-6 text-primary-500" />
                  <span className="text-sm font-semibold text-gray-700">{value}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('description')}</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>

            {/* Map */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('location')}</h2>
              <MapView properties={mapProperties} center={[property.lat, property.lng]} zoom={15} className="h-72 rounded-xl overflow-hidden" />
            </div>
          </div>

          {/* Right: Agent Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-card p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('contactAgent')}</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-200">
                  {property.agent.avatar && (
                    <Image src={property.agent.avatar} alt={property.agent.name} fill className="object-cover" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{property.agent.name}</p>
                  <p className="text-sm text-gray-500">{property.agent.phone}</p>
                </div>
              </div>
              <div className="space-y-3">
                <Button className="w-full">
                  <Calendar className="h-4 w-4 me-2" />
                  {t('bookViewing')}
                </Button>
                <Button variant="outline" className="w-full">
                  {t('sendMessage')}
                </Button>
              </div>
              <p className="mt-4 text-xs text-center text-gray-400">
                {t('listedOn', {
                  date: new Date(property.createdAt).toLocaleDateString(
                    locale === 'fa' ? 'fa-IR-u-ca-gregory' : 'en-US',
                    { month: 'long', day: 'numeric', year: 'numeric' }
                  ),
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
