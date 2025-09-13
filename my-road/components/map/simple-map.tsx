'use client';

import { useEffect, useRef, useState } from 'react';

export default function SimpleMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('初期化中...');

  useEffect(() => {
    const initMap = async () => {
      try {
        setStatus('Google Maps APIを読み込み中...');
        
        // Google Maps APIが既に読み込まれているかチェック
        if (window.google && window.google.maps) {
          await createMap();
          return;
        }

        // APIが読み込まれていない場合は、Loaderを使用（最適化済み）
        const { Loader } = await import('@googlemaps/js-api-loader');
        
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places', 'marker']
        });

        await loader.load();
        await createMap();
      } catch (error) {
        console.error('Google Maps APIの読み込みエラー:', error);
        setStatus('Google Maps APIの読み込みに失敗しました');
      }
    };

    const createMap = async () => {
      if (!mapRef.current) {
        setStatus('地図コンテナが見つかりません');
        return;
      }

      try {
        setStatus('地図を作成中...');
        
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 35.6762, lng: 139.6503 }, // 東京駅
          zoom: 13,
          mapId: 'DEMO_MAP_ID', // AdvancedMarkerElementにはmapIdが必要
        });

        // AdvancedMarkerElementを使用
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        
        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: 35.6762, lng: 139.6503 },
          title: '東京駅'
        });

        setStatus('地図の読み込み完了');
        
        // クリックイベントリスナー
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            console.log('クリック位置:', e.latLng.lat(), e.latLng.lng());
            
            new AdvancedMarkerElement({
              map,
              position: e.latLng,
              title: 'クリックした場所'
            });
          }
        });

      } catch (error) {
        console.error('地図作成エラー:', error);
        setStatus(`地図作成エラー: ${error}`);
      }
    };

    initMap();

    // クリーンアップ
    return () => {
      if ((window as any).initGoogleMap) {
        delete (window as any).initGoogleMap;
      }
    };
  }, []);

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