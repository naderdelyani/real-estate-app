'use client';

import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface MapProperty {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price: number;
}

interface MapViewProps {
  properties: MapProperty[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (id: string) => void;
}

/**
 * Client-side Leaflet map loaded dynamically to avoid SSR issues.
 * Renders a marker for each property with a popup showing title and price.
 */
export function MapView({ properties, center, zoom = 12, className, onMarkerClick }: MapViewProps) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    // Dynamic import keeps Leaflet out of the SSR bundle
    import('leaflet').then((L) => {
      // Fix default icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const defaultCenter: [number, number] =
        center ?? (properties[0] ? [properties[0].lat, properties[0].lng] : [51.505, -0.09]);

      const map = L.map(mapRef.current!).setView(defaultCenter, zoom);
      leafletRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      properties.forEach(({ id, lat, lng, title, price }) => {
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`
          <div style="min-width:140px">
            <strong style="font-size:13px">${title}</strong><br/>
            <span style="color:#2563eb;font-weight:600">$${price.toLocaleString()}</span>
          </div>
        `);
        if (onMarkerClick) {
          marker.on('click', () => onMarkerClick(id));
        }
      });

      // Fit bounds to all markers when no explicit center is given
      if (!center && properties.length > 1) {
        const bounds = L.latLngBounds(properties.map(({ lat, lng }) => [lat, lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      leafletRef.current?.remove();
      leafletRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Leaflet CSS — loaded once per page */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={mapRef} className={clsx('w-full', className)} />
    </>
  );
}
