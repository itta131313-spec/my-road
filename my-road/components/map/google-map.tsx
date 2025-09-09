'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapProps {
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
  experiences?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    category: string;
    rating: number;
    address?: string;
  }>;
}

export default function GoogleMap({ onLocationSelect, experiences = [] }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLocationSelect = useCallback((location: { lat: number; lng: number; address?: string }) => {
    onLocationSelect?.(location);
  }, [onLocationSelect]);

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: 'weekly',
        libraries: ['places']
      });

      const { Map } = await loader.importLibrary('maps');
      const { AdvancedMarkerElement } = await loader.importLibrary('marker');

      if (mapRef.current) {
        const mapInstance = new Map(mapRef.current, {
          center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
          zoom: 13,
          mapId: 'MY_ROAD_MAP'
        });

        // クリックで場所を選択
        mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const location = {
              lat: e.latLng.lat(),
              lng: e.latLng.lng()
            };
            
            // Geocoding APIで住所を取得
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: e.latLng }, (results, status) => {
              if (status === 'OK' && results?.[0]) {
                const locationWithAddress = {
                  ...location,
                  address: results[0].formatted_address
                };
                console.log('Selected location:', locationWithAddress);
                handleLocationSelect(locationWithAddress);
              } else {
                console.log('Selected location:', location);
                handleLocationSelect(location);
              }
            });
          }
        });

        setMap(mapInstance);
        setIsLoaded(true);
      }
    };

    initMap().catch(console.error);
  }, [handleLocationSelect]);

  // 体験データのマーカーを表示
  useEffect(() => {
    if (map && isLoaded && experiences.length > 0) {
      experiences.forEach((experience) => {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: experience.latitude, lng: experience.longitude },
          title: `${experience.category} - ${experience.rating}★`
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">${experience.category}</h3>
              <p class="text-sm">評価: ${'★'.repeat(experience.rating)}</p>
              ${experience.address ? `<p class="text-xs text-gray-600">${experience.address}</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });
    }
  }, [map, isLoaded, experiences]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-lg shadow-lg"
      style={{ minHeight: '400px' }}
    />
  );
}