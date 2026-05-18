import { Building2 } from 'lucide-react';
import { PropertyCard, type PropertyCardData } from './PropertyCard';

interface PropertyListProps {
  properties: PropertyCardData[];
  favoritedIds?: string[];
  onFavorite?: (id: string) => void;
}

/** Renders a responsive grid of PropertyCards or an empty-state message. */
export function PropertyList({ properties, favoritedIds = [], onFavorite }: PropertyListProps) {
  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
          <Building2 className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">No properties found</h3>
        <p className="mt-1 text-sm text-gray-500">Try adjusting your search filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isFavorited={favoritedIds.includes(property.id)}
          onFavorite={onFavorite}
        />
      ))}
    </div>
  );
}
