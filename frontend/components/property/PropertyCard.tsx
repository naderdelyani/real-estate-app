'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { Bed, Bath, Maximize2, MapPin, Heart } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export interface PropertyCardData {
  id: string;
  title: string;
  price: number;
  type: 'sale' | 'rent';
  status: 'available' | 'sold' | 'rented';
  bedrooms: number;
  bathrooms: number;
  area: number;
  address: string;
  city: string;
  images: { url: string; alt?: string }[];
}

interface PropertyCardProps {
  property: PropertyCardData;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

function formatPrice(price: number, type: 'sale' | 'rent'): string {
  return `$${price.toLocaleString()}${type === 'rent' ? '/mo' : ''}`;
}

export function PropertyCard({ property, onFavorite, isFavorited = false }: PropertyCardProps) {
  const t = useTranslations('propertyCard');
  const { id, title, price, type, status, bedrooms, bathrooms, area, address, city, images } = property;
  const coverImage = images[0];

  return (
    <Card hoverable className="group flex flex-col animate-fade-in">
      <Link href={`/properties/${id}`} className="block relative h-52 bg-gray-100 overflow-hidden">
        {coverImage ? (
          <Image
            src={coverImage.url}
            alt={coverImage.alt ?? title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
            {t('noImage')}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 start-3 flex gap-1.5">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
            type === 'sale' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'
          }`}>
            {t(type === 'sale' ? 'forSale' : 'forRent')}
          </span>
          {status !== 'available' && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-red-500 text-white">
              {t(status)}
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => { e.preventDefault(); onFavorite?.(id); }}
          aria-label={isFavorited ? t('removeFromFavorites') : t('addToFavorites')}
          className="absolute top-3 end-3 p-1.5 rounded-full bg-white/80 backdrop-blur hover:bg-white transition-colors"
        >
          <Heart className={`h-4 w-4 transition-colors ${isFavorited ? 'fill-red-500 stroke-red-500' : 'stroke-gray-600'}`} />
        </button>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <p className="text-xl font-bold text-primary-600">{formatPrice(price, type)}</p>

        <Link href={`/properties/${id}`} className="mt-1 block">
          <h3 className="font-semibold text-gray-900 line-clamp-2 hover:text-primary-600 transition-colors leading-snug">
            {title}
          </h3>
        </Link>

        <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500 truncate">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {address}, {city}
        </p>

        {/* Stats row */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
          <span className="flex items-center gap-1"><Bed       className="h-4 w-4 text-gray-400" />{t('beds',  { count: bedrooms })}</span>
          <span className="flex items-center gap-1"><Bath      className="h-4 w-4 text-gray-400" />{t('baths', { count: bathrooms })}</span>
          <span className="flex items-center gap-1"><Maximize2 className="h-4 w-4 text-gray-400" />{area} m²</span>
        </div>
      </div>
    </Card>
  );
}
