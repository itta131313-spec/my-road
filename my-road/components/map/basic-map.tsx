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
    age_group?: string;
    gender?: string;
    time_of_day?: string;
    created_at?: string;
    place_id?: string;
    place_name?: string;
    website?: string;
    google_url?: string;
    phone?: string;
  }>;
  onLocationSelect?: (location: { lat: number; lng: number; address?: string }) => void;
  selectedExperienceId?: string;
  onExperienceSelect?: (experience: any) => void;
  showExperiencePopup?: boolean;
  mapFilters?: {
    categories: string[];
    minRating: number;
    sortBy: string;
    showLabels: boolean;
  };
}

export default function BasicMap({
  searchLocation,
  experiences = [],
  onLocationSelect,
  selectedExperienceId,
  onExperienceSelect,
  showExperiencePopup = true,
  mapFilters = { categories: [], minRating: 1, sortBy: 'rating', showLabels: true }
}: BasicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('初期化中...');
  const [map, setMap] = useState<any>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const experienceMarkersRef = useRef<any[]>([]);
  const lastClickRef = useRef<{markerId: string, time: number} | null>(null);

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
          // インフォウィンドウを閉じてラベルを再表示
          experienceMarkersRef.current.forEach(({ infoWindow }) => {
            if (infoWindow) {
              infoWindow.close();
            }
          });

          // ラベルを再表示（showLabelsがtrueの場合のみ）
          if (mapFilters.showLabels) {
            experienceMarkersRef.current.forEach(({ label, marker }) => {
              if (label) {
                label.open(mapInstance, marker);
              }
            });
          }

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

  // カテゴリ別のマーカー色を取得
  const getCategoryIcon = (category: string) => {
    const categoryColors: { [key: string]: string } = {
      '居酒屋': 'red',
      'カフェ': 'orange',
      'レストラン': 'yellow',
      'ラーメン': 'green',
      '銭湯': 'blue',
      'サウナ': 'purple',
      '公園': 'lightblue',
      '美術館': 'pink',
      'ショッピング': 'white',
      'その他': 'gray'
    };

    const color = categoryColors[category] || 'blue';
    return {
      url: `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png`
    };
  };

  // 体験データをフィルタリング
  const getFilteredExperiences = () => {
    let filtered = [...experiences];

    // カテゴリフィルタ
    if (mapFilters.categories && mapFilters.categories.length > 0) {
      filtered = filtered.filter(exp => mapFilters.categories.includes(exp.category));
    }

    // 評価フィルタ
    if (mapFilters.minRating > 1) {
      filtered = filtered.filter(exp => exp.rating >= mapFilters.minRating);
    }

    // ソート
    filtered.sort((a, b) => {
      switch (mapFilters.sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'category':
          return a.category.localeCompare(b.category);
        case 'created_at':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  };

  // 体験データを地図に表示
  useEffect(() => {
    if (!map) return;

    const filteredExperiences = getFilteredExperiences();
    console.log('BasicMap: フィルタリング済み体験データ:', filteredExperiences);

    // 既存の体験マーカーをクリア
    experienceMarkersRef.current.forEach(({ marker, infoWindow, label }) => {
      marker.setMap(null);
      infoWindow.close();
      if (label) label.close();
    });
    experienceMarkersRef.current = [];

    if (filteredExperiences.length === 0) return;

    const markers: any[] = [];
    let experienceWithPlaceInfo: any = null;

    // インフォウィンドウの内容を動的に生成する関数（共通化）
    const generateInfoWindowContent = (exp: any) => {
      console.log('インフォウィンドウ生成 - データ確認:', {
        category: exp.category,
        rating: exp.rating,
        age_group: exp.age_group,
        gender: exp.gender,
        time_of_day: exp.time_of_day,
        address: exp.address
      });

      return `
        <div style="min-width: 250px; max-width: 350px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <div style="margin-bottom: 12px;">
            <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">${exp.category || '不明'}</h3>
          </div>

          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <span style="color: #374151; font-weight: 500; margin-right: 8px;">評価:</span>
            <span style="color: #fbbf24; font-size: 16px;">${exp.rating ? '★'.repeat(exp.rating) : ''}</span>
            <span style="color: #d1d5db; font-size: 16px;">${exp.rating ? '☆'.repeat(5 - exp.rating) : '☆☆☆☆☆'}</span>
            <span style="margin-left: 6px; color: #6b7280; font-size: 14px;">(${exp.rating || 0}/5)</span>
          </div>

          ${(exp.age_group || exp.gender || exp.time_of_day) ? `
            <div style="margin-bottom: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
              ${exp.age_group ? `<span style="background-color: #ddd6fe; color: #5b21b6; padding: 2px 6px; border-radius: 12px; font-size: 12px;">${exp.age_group}</span>` : ''}
              ${exp.gender ? `<span style="background-color: #fce7f3; color: #be185d; padding: 2px 6px; border-radius: 12px; font-size: 12px;">${exp.gender}</span>` : ''}
              ${exp.time_of_day ? `<span style="background-color: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 12px; font-size: 12px;">${exp.time_of_day}</span>` : ''}
            </div>
          ` : ''}

          ${exp.address ? `
            <div style="margin-bottom: 10px; padding: 8px; background-color: #f9fafb; border-radius: 6px; max-width: 100%; overflow: hidden;">
              <div style="color: #374151; font-size: 13px; line-height: 1.5; word-break: break-word; white-space: normal; overflow-wrap: break-word;">
                <span style="color: #059669; margin-right: 4px;">📍</span>
                ${exp.place_name || exp.address}
              </div>
              ${exp.address !== exp.place_name && exp.address ? `
                <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">
                  ${exp.address}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${(exp.website || exp.google_url || exp.phone) ? `
            <div style="margin-bottom: 10px; padding: 8px; background-color: #eff6ff; border-radius: 6px;">
              <div style="color: #1e40af; font-size: 12px; font-weight: 500; margin-bottom: 6px;">📋 詳細情報</div>
              <div style="color: #6b7280; font-size: 11px; margin-bottom: 6px; font-style: italic;">
                ※リンクを開くには、マーカーを素早く2回クリック（ダブルクリック）してください
              </div>
              ${exp.website ? `
                <div style="margin-bottom: 4px; padding: 3px 6px; background: rgba(37, 99, 235, 0.1); border-radius: 4px; border: 1px solid rgba(37, 99, 235, 0.3);">
                  <span style="color: #2563eb; font-size: 12px; font-weight: 500;">🌐 ホームページ</span>
                  <div style="color: #6b7280; font-size: 10px; margin-top: 2px; word-break: break-all;">
                    ${exp.website}
                  </div>
                </div>
              ` : ''}
              ${exp.google_url ? `
                <div style="margin-bottom: 4px; padding: 3px 6px; background: rgba(22, 163, 74, 0.1); border-radius: 4px; border: 1px solid rgba(22, 163, 74, 0.3);">
                  <span style="color: #16a34a; font-size: 12px; font-weight: 500;">🗺️ Google マップ</span>
                  <div style="color: #6b7280; font-size: 10px; margin-top: 2px;">
                    座標: ${exp.latitude ? exp.latitude.toFixed(6) : 'N/A'}, ${exp.longitude ? exp.longitude.toFixed(6) : 'N/A'}
                  </div>
                </div>
              ` : ''}
              ${exp.phone ? `
                <div style="margin-bottom: 4px; padding: 3px 6px; background: rgba(220, 38, 38, 0.1); border-radius: 4px; border: 1px solid rgba(220, 38, 38, 0.3);">
                  <span style="color: #dc2626; font-size: 12px; font-weight: 500;">📞 電話番号</span>
                  <div style="color: #6b7280; font-size: 10px; margin-top: 2px;">
                    ${exp.phone}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
            <div style="color: #6b7280; font-size: 12px; text-align: center;">
              クリックして詳細を確認
            </div>
          </div>
        </div>
      `;
    };

    filteredExperiences.forEach((experience, index) => {
      console.log('地図マーカー作成 - experience data:', experience);

      // 同じ位置にあるマーカーの場合、わずかにずらす
      const existingMarker = markers.find(m =>
        Math.abs(m.marker.getPosition().lat() - experience.latitude) < 0.0001 &&
        Math.abs(m.marker.getPosition().lng() - experience.longitude) < 0.0001
      );

      const position = existingMarker ? {
        lat: experience.latitude + (index * 0.00005), // わずかにずらす
        lng: experience.longitude + (index * 0.00005)
      } : {
        lat: experience.latitude,
        lng: experience.longitude
      };

      const marker = new window.google.maps.Marker({
        position: position,
        map: map,
        title: `${experience.category} - ${experience.rating}★`,
        icon: getCategoryIcon(experience.category),
        zIndex: 1000 + index // 重なった場合の表示順序
      });

      // ラベル表示（mapFilters.showLabelsがtrueの場合）
      let label: any = null;
      if (mapFilters.showLabels) {
        label = new window.google.maps.InfoWindow({
          content: `
            <div style="background: rgba(0,0,0,0.8); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap; border: none; box-shadow: none;">
              ${experience.category} ${experience.rating}★
            </div>
          `,
          disableAutoPan: true,
          pixelOffset: new window.google.maps.Size(0, -45),
          closeBoxURL: '', // 閉じるボタンを非表示
        });
        label.open(map, marker);
      }


      const infoWindow = new window.google.maps.InfoWindow({
        content: generateInfoWindowContent(experience),
        maxWidth: 400,
        pixelOffset: new window.google.maps.Size(0, -10) // 少し下にずらす
      });

      marker.addListener('click', () => {
        console.log(`マーカークリック: ${experience.category} (ID: ${experience.id})`, experience);

        const now = Date.now();
        const currentClick = {markerId: experience.id, time: now};

        // ダブルクリック判定（500ms以内に同じマーカーをクリック）
        if (lastClickRef.current &&
            lastClickRef.current.markerId === experience.id &&
            now - lastClickRef.current.time < 500) {

          // ダブルクリック時の処理：リンクオプションを表示
          if (experience.website || experience.google_url || experience.phone) {
            const links = [];
            if (experience.website) links.push(`🌐 ホームページ: ${experience.website}`);
            if (experience.google_url) links.push(`🗺️ Google マップ: 座標表示`);
            if (experience.phone) links.push(`📞 電話: ${experience.phone}`);

            const choice = confirm(
              `詳細情報を開きますか？\n\n${links.join('\n')}\n\n` +
              'OKでホームページを開く（ホームページがある場合）\n' +
              'キャンセルでGoogle マップを開く'
            );

            if (choice && experience.website) {
              window.open(experience.website, '_blank', 'noopener,noreferrer');
            } else if (experience.google_url) {
              window.open(experience.google_url, '_blank', 'noopener,noreferrer');
            }
          }
          lastClickRef.current = null;
          return;
        }

        lastClickRef.current = currentClick;

        // 通常のクリック処理
        // 他のインフォウィンドウを閉じ、全てのラベルを非表示にする
        markers.forEach(m => {
          if (m.infoWindow) {
            m.infoWindow.close();
          }
          if (m.label && mapFilters.showLabels) {
            m.label.close();
          }
        });

        // 新しいコンテンツで更新（最新のデータを確実に表示）
        infoWindow.setContent(generateInfoWindowContent(experience));
        infoWindow.open(map, marker);

        // インフォウィンドウが閉じられた時のイベントリスナーを追加
        const closeListener = () => {
          // ラベルを再表示
          if (mapFilters.showLabels) {
            markers.forEach(m => {
              if (m.label) {
                m.label.open(map, m.marker);
              }
            });
          }
          // イベントリスナーを削除（メモリリーク防止）
          window.google.maps.event.removeListener(closeListener);
        };

        // インフォウィンドウのcloseイベントにリスナーを追加
        window.google.maps.event.addListener(infoWindow, 'closeclick', closeListener);

        // 体験選択コールバック
        if (onExperienceSelect) {
          onExperienceSelect(experience);
        }
      });

      markers.push({ marker, infoWindow, label });

      // 店舗情報（place_name, website, phone等）がある体験を記録
      if ((experience.place_name || experience.website || experience.phone) && !experienceWithPlaceInfo) {
        experienceWithPlaceInfo = { experience, marker, infoWindow };
      }
    });

    // refに保存
    experienceMarkersRef.current = markers;

    // 店舗情報がある体験のInfoWindowを自動で開く（検索した場所から近い順）
    if (experienceWithPlaceInfo && searchLocation) {
      setTimeout(() => {
        console.log('店舗情報がある体験を自動表示:', experienceWithPlaceInfo.experience);

        // 他のInfoWindowを閉じる
        markers.forEach(m => {
          if (m.infoWindow && m.infoWindow !== experienceWithPlaceInfo.infoWindow) {
            m.infoWindow.close();
          }
          if (m.label && mapFilters.showLabels) {
            m.label.close();
          }
        });

        // 店舗情報がある体験のInfoWindowを開く
        experienceWithPlaceInfo.infoWindow.setContent(generateInfoWindowContent(experienceWithPlaceInfo.experience));
        experienceWithPlaceInfo.infoWindow.open(map, experienceWithPlaceInfo.marker);


      }, 500); // 地図の読み込み完了を待つ
    }

  }, [map, experiences, mapFilters, searchLocation]);

  return (
    <div className="w-full h-full min-h-[400px]">
      <div className="mb-2 flex justify-between items-center text-sm text-gray-600">
        <span>状態: {status}</span>
        {experiences.length > 0 && (
          <span>体験数: {experiences.length}件</span>
        )}
      </div>

      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-full min-h-[400px] bg-gray-200 rounded border"
          style={{ minHeight: '400px' }}
        />

        {/* 体験統計ポップアップ */}
        {showExperiencePopup && experiences.length > 0 && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 max-w-xs z-10">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-semibold text-gray-800">体験マップ</h4>
              <div className="text-xs text-gray-500">
                {getFilteredExperiences().length}/{experiences.length}件
              </div>
            </div>

            {/* 統計情報（表示されているもののみ） */}
            <div className="mb-2">
              <div className="text-xs text-gray-600 mb-1">表示中のカテゴリ</div>
              <div className="space-y-1">
                {Object.entries({
                  '居酒屋': 'red',
                  'カフェ': 'orange',
                  'レストラン': 'yellow',
                  'ラーメン': 'green',
                  '銭湯': 'blue',
                  'サウナ': 'purple',
                  '公園': 'lightblue',
                  '美術館': 'pink',
                  'ショッピング': 'white',
                  'その他': 'gray'
                }).map(([category, color]) => {
                  const count = getFilteredExperiences().filter(exp => exp.category === category).length;
                  return count > 0 ? (
                    <div key={category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center">
                        <div
                          className="w-2 h-2 rounded-full mr-1 border border-gray-300"
                          style={{ backgroundColor: color === 'white' ? '#fff' : color }}
                        />
                        <span>{category}</span>
                      </div>
                      <span className="text-gray-500">({count})</span>
                    </div>
                  ) : null;
                })}
              </div>
            </div>

            {/* 評価統計 */}
            {getFilteredExperiences().length > 0 && (
              <div className="text-xs border-t border-gray-200 pt-2">
                <div className="text-gray-600">平均評価</div>
                <div className="text-sm font-semibold text-blue-600">
                  {(getFilteredExperiences().reduce((sum, exp) => sum + exp.rating, 0) / getFilteredExperiences().length).toFixed(1)}★
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}