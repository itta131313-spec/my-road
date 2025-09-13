'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google: any;
    initBasicMap: () => void;
  }
}

interface BasicMapProps {
  searchLocation?: {
    lat: number;
    lng: number;
    address: string;
    name?: string;
  } | null;
  experiences?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    category: string;
    rating: number;
    address?: string;
  }>;
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
}

export default function BasicMap({ searchLocation, experiences = [], onLocationSelect }: BasicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('初期化中...');
  const [map, setMap] = useState<any>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  useEffect(() => {
    const loadGoogleMaps = () => {
      setStatus('Google Maps APIを読み込み中...');

      // Google Maps APIが既に読み込まれているかチェック
      if (window.google && window.google.maps) {
        createMap();
        return;
      }

      // グローバルコールバック関数を設定
      window.initBasicMap = createMap;

      // スクリプトタグで読み込み（Places libraryを含む）
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&callback=initBasicMap`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        setStatus('Google Maps APIの読み込みに失敗しました');
      };

      document.head.appendChild(script);
    };

    const createMap = () => {
      if (!mapRef.current) {
        setStatus('地図コンテナが見つかりません');
        return;
      }

      try {
        setStatus('地図を作成中...');

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
          zoom: 13,
        });

        setMap(mapInstance);
        setStatus('地図の読み込み完了');

        // クリックイベントリスナー
        mapInstance.addListener('click', (e: any) => {
          if (e.latLng && onLocationSelect) {
            const location = {
              lat: e.latLng.lat(),
              lng: e.latLng.lng()
            };
            
            console.log('クリック位置:', location);
            
            // 前の選択マーカーを削除
            if (selectedMarker) {
              selectedMarker.setMap(null);
            }
            
            // 住所を取得してコールバックを実行
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: e.latLng }, (results: any, status: any) => {
              if (status === 'OK' && results?.[0]) {
                const locationWithAddress = {
                  ...location,
                  address: results[0].formatted_address
                };
                console.log('Selected location with address:', locationWithAddress);
                onLocationSelect(locationWithAddress);
              } else {
                console.log('Selected location without address:', location);
                onLocationSelect(location);
              }
            });
            
            // 新しい選択マーカーを追加
            const marker = new window.google.maps.Marker({
              position: e.latLng,
              map: mapInstance,
              title: 'クリックした場所',
              icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
              }
            });
            
            setSelectedMarker(marker);
          }
        });

      } catch (error) {
        console.error('地図作成エラー:', error);
        setStatus(`地図作成エラー: ${error}`);
      }
    };

    loadGoogleMaps();

    // クリーンアップ
    return () => {
      if ((window as any).initBasicMap) {
        (window as any).initBasicMap = undefined;
      }
    };
  }, []);

  // 検索場所を地図に表示
  useEffect(() => {
    if (!map || !searchLocation) return;

    // 検索マーカーを追加（緑色のデフォルトアイコン）
    const searchMarker = new window.google.maps.Marker({
      position: { lat: searchLocation.lat, lng: searchLocation.lng },
      map: map,
      title: searchLocation.name || searchLocation.address,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      }
    });

    // 地図の中心を移動
    map.setCenter({ lat: searchLocation.lat, lng: searchLocation.lng });
    map.setZoom(15);

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div>
          <h3>${searchLocation.name || '検索結果'}</h3>
          <p>${searchLocation.address}</p>
        </div>
      `
    });

    searchMarker.addListener('click', () => {
      infoWindow.open(map, searchMarker);
    });

    // 自動的にインフォウィンドウを表示
    setTimeout(() => {
      infoWindow.open(map, searchMarker);
    }, 500);

  }, [map, searchLocation]);

  // 体験データを地図に表示
  useEffect(() => {
    if (!map || experiences.length === 0) return;

    experiences.forEach((experience) => {
      const marker = new window.google.maps.Marker({
        position: { lat: experience.latitude, lng: experience.longitude },
        map: map,
        title: `${experience.category} - ${experience.rating}★`,
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div>
            <h3>${experience.category}</h3>
            <p>評価: ${'★'.repeat(experience.rating)}</p>
            ${experience.address ? `<p>${experience.address}</p>` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });

  }, [map, experiences]);

  return (
    <div className="w-full h-full min-h-[400px]">
      <div className="mb-2 text-sm text-gray-600">
        状態: {status}
      </div>
      <div 
        ref={mapRef} 
        className="w-full h-full min-h-[400px] bg-gray-200 rounded border"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
}