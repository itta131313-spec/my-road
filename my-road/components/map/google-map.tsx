'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface RouteWithSteps {
  id: string;
  title: string;
  steps: Array<{
    id: string;
    step_order: number;
    duration_minutes: number;
    travel_time_to_next: number;
    notes: string;
    experience: {
      id: string;
      category: string;
      rating: number;
      address: string;
      latitude: number;
      longitude: number;
    };
  }>;
}

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
  selectedRoute?: RouteWithSteps | null;
  selectedExperience?: {
    id: string;
    latitude: number;
    longitude: number;
    category: string;
    rating: number;
    address?: string;
  } | null;
  searchLocation?: {
    lat: number;
    lng: number;
    address: string;
    name?: string;
  } | null;
}

export default function GoogleMap({ onLocationSelect, experiences = [], selectedRoute, selectedExperience, searchLocation }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [routePolylines, setRoutePolylines] = useState<google.maps.Polyline[]>([]);
  const [routeMarkers, setRouteMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [searchMarker, setSearchMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const handleLocationSelect = useCallback((location: { lat: number; lng: number; address?: string }) => {
    onLocationSelect?.(location);
  }, [onLocationSelect]);

  useEffect(() => {
    const initMap = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
          throw new Error('Google Maps API キーが設定されていません');
        }

        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        const { Map } = await loader.importLibrary('maps');
        // AdvancedMarkerElementの代わりに従来のMarkerを使用
        // const { AdvancedMarkerElement } = await loader.importLibrary('marker');

        if (mapRef.current) {
          const mapInstance = new Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
            zoom: 13,
            // mapIdを一時的に削除してテスト
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: true,
            fullscreenControl: true
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
      } catch (error) {
        console.error('地図の初期化エラー:', error);
        console.error('APIキー:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'あり' : 'なし');
        console.error('エラー詳細:', error);
        
        let errorMessage = '地図の読み込みに失敗しました';
        if (error instanceof Error) {
          if (error.message.includes('ApiNotActivated')) {
            errorMessage = 'Google Maps APIが有効化されていません。Google Cloud Consoleで以下のAPIを有効化してください：Maps JavaScript API, Places API, Geocoding API';
          } else if (error.message.includes('InvalidKey')) {
            errorMessage = 'Google Maps APIキーが無効です。.env.localファイルのNEXT_PUBLIC_GOOGLE_MAPS_API_KEYを確認してください';
          } else if (error.message.includes('RefererNotAllowed')) {
            errorMessage = 'HTTPリファラー制限によりアクセスが拒否されました。Google Cloud ConsoleでAPIキーの制限設定を確認してください';
          } else {
            errorMessage = error.message;
          }
        }
        
        setLoadError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initMap();
  }, [handleLocationSelect]);

  // 体験データのマーカーを表示（選択されたルートがない場合のみ）
  useEffect(() => {
    if (map && isLoaded && experiences.length > 0 && !selectedRoute) {
      experiences.forEach((experience) => {
        const isSelected = selectedExperience?.id === experience.id;
        
        const marker = new google.maps.Marker({
          map,
          position: { lat: experience.latitude, lng: experience.longitude },
          title: `${experience.category} - ${experience.rating}★`,
          icon: isSelected ? {
            url: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
                <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">★</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(40, 40)
          } : {
            url: 'data:image/svg+xml;base64,' + btoa(`
              <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" fill="#3b82f6" stroke="white" stroke-width="2"/>
                <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${experience.rating}</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32)
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold ${isSelected ? 'text-green-600' : ''}">${experience.category}</h3>
              <p class="text-sm">評価: ${'★'.repeat(experience.rating)}</p>
              ${experience.address ? `<p class="text-xs text-gray-600">${experience.address}</p>` : ''}
              ${isSelected ? '<p class="text-xs text-green-600 font-medium mt-1">選択中</p>' : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        // 選択された体験の場合、地図の中心を移動
        if (isSelected) {
          map.setCenter({ lat: experience.latitude, lng: experience.longitude });
          map.setZoom(15);
          // 自動的にインフォウィンドウを開く
          setTimeout(() => {
            infoWindow.open(map, marker);
          }, 500);
        }
      });
    }
  }, [map, isLoaded, experiences, selectedRoute, selectedExperience]);

  // 選択された体験のハイライトマーカー要素を作成
  const createHighlightMarkerElement = (category: string): HTMLDivElement => {
    const div = document.createElement('div');
    div.className = 'bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold border-3 border-white shadow-lg pulse-animation';
    div.textContent = '★';
    div.title = category;
    div.style.cssText += 'animation: pulse 2s infinite;';
    return div;
  };

  // 選択されたルートを地図上に表示
  useEffect(() => {
    if (!map || !isLoaded || !selectedRoute) {
      // 既存のルート表示をクリア
      routePolylines.forEach(polyline => polyline.setMap(null));
      routeMarkers.forEach(marker => marker.map = null);
      setRoutePolylines([]);
      setRouteMarkers([]);
      return;
    }

    // 既存のルート表示をクリア
    routePolylines.forEach(polyline => polyline.setMap(null));
    routeMarkers.forEach(marker => marker.map = null);

    const newPolylines: google.maps.Polyline[] = [];
    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    try {
      // ルートステップのマーカーを作成
      selectedRoute.steps.forEach((step, index) => {
        const position = {
          lat: step.experience.latitude,
          lng: step.experience.longitude
        };

        // ステップマーカーを作成（番号付き）
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          title: `${index + 1}. ${step.experience.category}`,
          content: createStepMarkerElement(index + 1, step.experience.category)
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-3">
              <h3 class="font-semibold text-blue-600">${index + 1}. ${step.experience.category}</h3>
              <p class="text-sm">評価: ${'★'.repeat(step.experience.rating)}</p>
              <p class="text-sm">滞在時間: ${step.duration_minutes}分</p>
              ${step.travel_time_to_next > 0 ? `<p class="text-sm">次まで: ${step.travel_time_to_next}分</p>` : ''}
              ${step.notes ? `<p class="text-sm text-gray-600 mt-1">${step.notes}</p>` : ''}
              ${step.experience.address ? `<p class="text-xs text-gray-500 mt-1">${step.experience.address}</p>` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);

        // 次のステップがある場合、ラインを描画
        if (index < selectedRoute.steps.length - 1) {
          const nextStep = selectedRoute.steps[index + 1];
          const nextPosition = {
            lat: nextStep.experience.latitude,
            lng: nextStep.experience.longitude
          };

          const polyline = new google.maps.Polyline({
            path: [position, nextPosition],
            geodesic: true,
            strokeColor: '#3B82F6',
            strokeOpacity: 0.8,
            strokeWeight: 3,
            map
          });

          newPolylines.push(polyline);
        }
      });

      // 地図の表示範囲を調整
      if (selectedRoute.steps.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        selectedRoute.steps.forEach(step => {
          bounds.extend({
            lat: step.experience.latitude,
            lng: step.experience.longitude
          });
        });
        map.fitBounds(bounds);
      }

      setRoutePolylines(newPolylines);
      setRouteMarkers(newMarkers);

    } catch (error) {
      console.error('ルート表示エラー:', error);
    }
  }, [map, isLoaded, selectedRoute]);

  // 検索場所のマーカー表示
  useEffect(() => {
    if (!map || !isLoaded) return;

    // 既存の検索マーカーをクリア
    if (searchMarker) {
      searchMarker.map = null;
      setSearchMarker(null);
    }

    if (!searchLocation) return;

    try {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: searchLocation.lat, lng: searchLocation.lng },
        title: searchLocation.name || searchLocation.address,
        content: createSearchMarkerElement(searchLocation.name || '検索結果')
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3">
            <h3 class="font-semibold text-green-600">${searchLocation.name || '検索結果'}</h3>
            <p class="text-sm text-gray-600 mt-1">${searchLocation.address}</p>
            <p class="text-xs text-green-600 font-medium mt-2">検索で見つかった場所</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      // 地図の中心を移動してズーム
      map.setCenter({ lat: searchLocation.lat, lng: searchLocation.lng });
      map.setZoom(16);

      // 自動的にインフォウィンドウを開く
      setTimeout(() => {
        infoWindow.open(map, marker);
      }, 500);

      setSearchMarker(marker);
    } catch (error) {
      console.error('検索マーカー表示エラー:', error);
    }
  }, [map, isLoaded, searchLocation, searchMarker]);

  // 検索マーカーのDOM要素を作成
  const createSearchMarkerElement = (name: string): HTMLDivElement => {
    const div = document.createElement('div');
    div.className = 'bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold border-3 border-white shadow-lg pulse-animation';
    div.innerHTML = '🔍';
    div.title = name;
    div.style.cssText += 'animation: pulse 2s infinite;';
    return div;
  };

  // ステップマーカーのDOM要素を作成
  const createStepMarkerElement = (stepNumber: number, category: string): HTMLDivElement => {
    const div = document.createElement('div');
    div.className = 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-white shadow-lg';
    div.textContent = stepNumber.toString();
    div.title = `${stepNumber}. ${category}`;
    return div;
  };

  if (isLoading) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-lg shadow-lg bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">地図を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-full min-h-[400px] rounded-lg shadow-lg bg-red-50 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 font-medium">地図の読み込みエラー</p>
          <p className="text-xs text-red-500 mt-1">{loadError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full min-h-[400px] rounded-lg shadow-lg"
      style={{ minHeight: '400px' }}
    />
  );
}