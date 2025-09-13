'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    google: any;
  }
}

interface ModernPlacesSearchProps {
  onPlaceSelect: (place: { lat: number; lng: number; address: string; name?: string }) => void;
}

interface PlaceResult {
  place_id: string;
  displayName: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
}

export default function ModernPlacesSearch({ onPlaceSelect }: ModernPlacesSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchPlaces = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    
    // Google Maps APIとPlaces libraryの読み込み待ち
    const waitForGoogleMaps = () => {
      if (window.google?.maps?.places) {
        performSearch();
      } else {
        console.log('Google Maps APIを待機中...');
        setTimeout(waitForGoogleMaps, 100);
      }
    };

    const performSearch = () => {
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request: any = {
        query: searchQuery,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types'],
        locationBias: {
          center: { lat: 35.6762, lng: 139.6503 },
          radius: 50000
        }
      };

      service.textSearch(request, (results: any, status: any) => {
        setIsSearching(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults: PlaceResult[] = results.slice(0, 5).map((place: any) => ({
            place_id: place.place_id || '',
            displayName: place.name || '',
            formattedAddress: place.formatted_address || '',
            location: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0
            },
            types: place.types || []
          }));
          
          setResults(formattedResults);
          setShowResults(true);
        } else {
          console.error('Places search failed:', status);
          setResults([]);
          setShowResults(false);
        }
      });
    };

    waitForGoogleMaps();
  }, []);


  const handleSearch = () => {
    searchPlaces(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    onPlaceSelect({
      lat: place.location.lat,
      lng: place.location.lng,
      address: place.formattedAddress,
      name: place.displayName
    });
    setQuery(place.displayName || place.formattedAddress);
    setShowResults(false);
  };

  const handleInputFocus = () => {
    if (results.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="住所や店舗名で検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="w-full"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {isSearching && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            )}
          </div>
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={isSearching || !query.trim()}
          size="sm"
        >
          検索
        </Button>
      </div>

      {/* 検索結果ドロップダウン */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {results.map((place) => (
            <div
              key={place.place_id}
              onClick={() => handlePlaceSelect(place)}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-900">
                {place.displayName || '住所'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {place.formattedAddress}
              </div>
              {place.types && place.types.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {place.types.slice(0, 3).map((type) => (
                    <span
                      key={type}
                      className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                    >
                      {getTypeLabel(type)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 検索結果なしの表示 */}
      {showResults && results.length === 0 && !isSearching && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3 text-center text-gray-500 text-sm">
            検索結果が見つかりませんでした
          </div>
        </div>
      )}
    </div>
  );
}

// Google Places APIのタイプを日本語ラベルに変換
function getTypeLabel(type: string): string {
  const typeLabels: { [key: string]: string } = {
    restaurant: 'レストラン',
    food: '飲食店',
    establishment: '施設',
    point_of_interest: '観光スポット',
    store: '店舗',
    lodging: '宿泊施設',
    tourist_attraction: '観光名所',
    shopping_mall: 'ショッピングモール',
    gas_station: 'ガソリンスタンド',
    bank: '銀行',
    hospital: '病院',
    pharmacy: '薬局',
    school: '学校',
    university: '大学',
    gym: 'ジム',
    beauty_salon: '美容院',
    cafe: 'カフェ',
    bar: 'バー',
    night_club: 'ナイトクラブ',
    spa: 'スパ',
    amusement_park: '遊園地',
    zoo: '動物園',
    museum: '博物館',
    library: '図書館',
    movie_theater: '映画館',
    park: '公園'
  };
  
  return typeLabels[type] || type;
}