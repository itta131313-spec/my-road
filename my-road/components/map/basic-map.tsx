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
  selectedExperience?: {
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
  } | null;
  onExperienceSelect?: (experience: any) => void;
  showExperiencePopup?: boolean;
  mapFilters?: {
    categories: string[];
    minRating: number;
    sortBy: string;
    showLabels: boolean;
  };
}

// 距離計算（ハベルサイン公式）
const calculateDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371; // 地球の半径 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // 距離 (km)
  return d;
};

// 検索場所の近くにある体験を検索する関数
const findNearbyExperiences = (
  searchLat: number,
  searchLng: number,
  experiences: any[],
  maxDistanceKm: number = 0.1 // 100m以内
) => {
  return experiences.filter(exp => {
    const distance = calculateDistance(
      searchLat, searchLng,
      exp.latitude, exp.longitude
    );
    return distance <= maxDistanceKm;
  }).sort((a, b) => {
    // 距離順でソート
    const distanceA = calculateDistance(searchLat, searchLng, a.latitude, a.longitude);
    const distanceB = calculateDistance(searchLat, searchLng, b.latitude, b.longitude);
    return distanceA - distanceB;
  });
};

export default function BasicMap({
  searchLocation,
  experiences = [],
  onLocationSelect,
  selectedExperienceId,
  selectedExperience,
  onExperienceSelect,
  showExperiencePopup = true,
  mapFilters = { categories: [], minRating: 1, sortBy: 'rating', showLabels: true }
}: BasicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('初期化中...');
  const [map, setMap] = useState<any>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [searchMarker, setSearchMarker] = useState<any>(null);
  const [currentInfoWindow, setCurrentInfoWindow] = useState<any>(null);
  const experienceMarkersRef = useRef<any[]>([]);

  // 改良されたInfoWindow管理（重複防止機能付き）
  const allInfoWindowsRef = useRef<any[]>([]);

  const registerInfoWindow = (infoWindow: any) => {
    if (!allInfoWindowsRef.current.includes(infoWindow)) {
      allInfoWindowsRef.current.push(infoWindow);
      console.log('InfoWindowを登録:', allInfoWindowsRef.current.length);
    }
  };

  const closeAllInfoWindows = () => {
    console.log('=== すべてのInfoWindowを閉じる ===');

    // 現在のインフォウィンドウを閉じる
    if (currentInfoWindow) {
      try {
        currentInfoWindow.close();
      } catch (e) {
        console.warn('currentInfoWindow のクローズエラー:', e);
      }
      setCurrentInfoWindow(null);
    }

    // 登録されたすべてのInfoWindowを閉じる
    allInfoWindowsRef.current.forEach((infoWindow, index) => {
      try {
        if (infoWindow && typeof infoWindow.close === 'function') {
          infoWindow.close();
          console.log(`InfoWindow ${index} を閉じました`);
        }
      } catch (e) {
        console.warn(`InfoWindow ${index} のクローズエラー:`, e);
      }
    });

    // 体験マーカーのインフォウィンドウを閉じる
    experienceMarkersRef.current.forEach(({ infoWindow }, index) => {
      if (infoWindow) {
        try {
          infoWindow.close();
          console.log(`体験マーカー ${index} のInfoWindowを閉じました`);
        } catch (e) {
          console.warn(`体験マーカー ${index} のクローズエラー:`, e);
        }
      }
    });

    // 配列をクリア
    allInfoWindowsRef.current = [];
  };

  const openInfoWindow = (infoWindow: any, marker: any) => {
    console.log('=== 新しいInfoWindowを開く ===');

    // まず全てのInfoWindowを閉じる
    closeAllInfoWindows();

    // 新しいInfoWindowを登録して開く
    setTimeout(() => {
      try {
        if (map && infoWindow && marker) {
          registerInfoWindow(infoWindow);
          infoWindow.open(map, marker);
          setCurrentInfoWindow(infoWindow);
          console.log('新しいInfoWindowを開きました');

          // InfoWindowが開いた後、z-indexを最前面に設定
          setTimeout(() => {
            try {
              // Google Maps特有のInfoWindowクラスを対象にする
              const gmStyleElements = document.querySelectorAll('.gm-style-iw, .gm-style-iw-c, .gm-style-iw-d');
              gmStyleElements.forEach((element: any) => {
                element.style.zIndex = '10000';
                if (element.parentElement) {
                  element.parentElement.style.zIndex = '10000';
                }
              });

              const infoWindowElements = document.querySelectorAll('.gm-ui-hover-effect');
              infoWindowElements.forEach((element: any) => {
                element.style.zIndex = '10000';
                if (element.parentElement) {
                  element.parentElement.style.zIndex = '10000';
                }
                if (element.parentElement?.parentElement) {
                  element.parentElement.parentElement.style.zIndex = '10000';
                }
                console.log('InfoWindowのz-indexを最前面に設定しました');
              });

              // より具体的なInfoWindow要素も対象にする
              const infoWindowContainers = document.querySelectorAll('div[style*="position: absolute"]');
              infoWindowContainers.forEach((element: any) => {
                if (element.innerHTML && (
                    element.innerHTML.includes('検索結果') ||
                    element.innerHTML.includes('この場所に体験投稿があります') ||
                    element.innerHTML.includes('選択中の体験') ||
                    element.innerHTML.includes('評価:') ||
                    element.innerHTML.includes('★'))) {
                  element.style.zIndex = '10000';
                  console.log('詳細InfoWindowのz-indexを最前面に設定しました');
                }
              });

              // より包括的なアプローチ：すべてのGoogle MapsのInfoWindow要素
              const allAbsoluteElements = document.querySelectorAll('div[style*="position: absolute"]');
              allAbsoluteElements.forEach((element: any) => {
                const rect = element.getBoundingClientRect();
                // 画面に表示されているInfoWindowっぽい要素（サイズで判定）
                if (rect.width > 200 && rect.height > 100 &&
                    (element.innerHTML.includes('🎯') ||
                     element.innerHTML.includes('★') ||
                     element.innerHTML.includes('詳細を見る'))) {
                  element.style.zIndex = '10000';
                  console.log('判定によりInfoWindowのz-indexを設定しました');
                }
              });
            } catch (zIndexError) {
              console.warn('z-index設定エラー:', zIndexError);
            }
          }, 100);
        }
      } catch (error) {
        console.warn('InfoWindowのオープンエラー:', error);
      }
    }, 50);
  };

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

        // 地図クリックイベントリスナー（簡素化）
        mapInstance.addListener('click', (e: any) => {
          console.log('地図がクリックされました');

          closeAllInfoWindows();

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
      closeAllInfoWindows();
      allInfoWindowsRef.current = [];
      if ((window as any).initBasicMap) {
        (window as any).initBasicMap = undefined;
      }
    };
  }, []);

  // 検索場所を地図に表示（簡素化）
  useEffect(() => {
    if (!map || !searchLocation) return;

    console.log('=== 検索場所を地図に表示 ===');
    console.log('searchLocation:', searchLocation);
    console.log('地図の中心を移動:', { lat: searchLocation.lat, lng: searchLocation.lng });

    // 前の検索マーカーをクリア
    if (searchMarker) {
      console.log('前の検索マーカーを削除');
      searchMarker.setMap(null);
    }

    // 新しい検索マーカーを追加（緑色のデフォルトアイコン）
    const newSearchMarker = new window.google.maps.Marker({
      position: { lat: searchLocation.lat, lng: searchLocation.lng },
      map: map,
      title: searchLocation.name || searchLocation.address,
      icon: {
        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      }
    });

    setSearchMarker(newSearchMarker);

    // 地図の中心を移動
    map.setCenter({ lat: searchLocation.lat, lng: searchLocation.lng });
    map.setZoom(15);

    console.log('地図の中心移動完了');

    // 検索場所の近くに体験があるかチェック
    const nearbyExperiences = findNearbyExperiences(
      searchLocation.lat,
      searchLocation.lng,
      experiences,
      0.15 // 150m以内
    );

    console.log('検索場所の近くの体験:', nearbyExperiences);

    // InfoWindowのコンテンツを生成
    let infoWindowContent = `
      <div style="min-width: 300px; max-width: 420px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
          <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">${searchLocation.name || '検索結果'}</h3>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 13px;">${searchLocation.address}</p>
        </div>
    `;

    if (nearbyExperiences.length > 0) {
      // 近くに体験がある場合は、体験情報を含むコンテンツを追加
      infoWindowContent += `
        <div style="margin-bottom: 12px; padding: 8px; background-color: #ecfdf5; border-radius: 6px; border: 2px solid #10b981;">
          <div style="color: #065f46; font-size: 14px; font-weight: 600; margin-bottom: 6px;">🎯 この場所に体験投稿があります！</div>
          <div style="color: #047857; font-size: 12px;">${nearbyExperiences.length}件の体験が見つかりました</div>
        </div>

        ${nearbyExperiences.slice(0, 3).map((exp) => `
          <div style="margin-bottom: 8px; padding: 8px; background-color: #f9fafb; border-radius: 6px; border-left: 3px solid #3b82f6; cursor: pointer; transition: background-color 0.2s;"
               onmouseover="this.style.backgroundColor='#f0f9ff'"
               onmouseout="this.style.backgroundColor='#f9fafb'"
               onclick="window.open('/experience/${exp.id}', '_blank')">
            <div style="font-weight: 600; color: #1e40af; font-size: 14px; margin-bottom: 4px;">
              ${exp.category}
              <span style="float: right; font-size: 11px; color: #3b82f6;">📖 詳細を見る</span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="color: #fbbf24; font-size: 14px; margin-right: 6px;">${exp.rating ? '★'.repeat(exp.rating) : ''}</span>
              <span style="color: #d1d5db; font-size: 14px; margin-right: 6px;">${exp.rating ? '☆'.repeat(5 - exp.rating) : '☆☆☆☆☆'}</span>
              <span style="color: #6b7280; font-size: 12px;">(${exp.rating || 0}/5)</span>
            </div>
            <div style="font-size: 11px; color: #6b7280;">
              ${exp.age_group || ''} ${exp.gender || ''} ${exp.time_of_day || ''}
              ${calculateDistance(searchLocation.lat, searchLocation.lng, exp.latitude, exp.longitude) < 0.01
                ? '(同じ場所)'
                : `(${Math.round(calculateDistance(searchLocation.lat, searchLocation.lng, exp.latitude, exp.longitude) * 1000)}m)`}
            </div>
          </div>
        `).join('')}

        ${nearbyExperiences.length > 3 ? `
          <div style="text-align: center; margin-top: 8px; padding: 6px; background-color: #f3f4f6; border-radius: 4px;">
            <span style="font-size: 12px; color: #6b7280;">他${nearbyExperiences.length - 3}件の体験があります</span>
          </div>
        ` : ''}

        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center;">
          <div style="color: #6b7280; font-size: 12px;">
            体験マーカーをクリックして詳細を確認
          </div>
        </div>
      `;
    }

    infoWindowContent += `</div>`;

    const infoWindow = new window.google.maps.InfoWindow({
      content: infoWindowContent,
      maxWidth: 420,
      zIndex: 9999  // 最前面に表示
    });

    newSearchMarker.addListener('click', () => {
      openInfoWindow(infoWindow, newSearchMarker);
    });

    // 自動でインフォウィンドウを表示
    setTimeout(() => {
      openInfoWindow(infoWindow, newSearchMarker);

      // 近くに体験がある場合は、該当する体験マーカーも強調表示
      if (nearbyExperiences.length > 0) {
        console.log('近くの体験マーカーを強調表示');
        nearbyExperiences.forEach((exp, index) => {
          if (index < 3) { // 最大3つまで強調
            const expMarker = experienceMarkersRef.current.find(m => {
              const position = m.marker.getPosition();
              return Math.abs(position.lat() - exp.latitude) < 0.00001 &&
                     Math.abs(position.lng() - exp.longitude) < 0.00001;
            });

            if (expMarker) {
              try {
                expMarker.marker.setAnimation(window.google.maps.Animation.BOUNCE);
                // 3秒後にアニメーションを停止
                setTimeout(() => {
                  try {
                    expMarker.marker.setAnimation(null);
                  } catch (e) {
                    // エラーは無視
                  }
                }, 3000);
              } catch (e) {
                // エラーは無視
              }
            }
          }
        });
      }
    }, 150);

  }, [map, searchLocation]);

  // 選択された体験を地図に表示（検索場所が設定されていない場合のみ）
  useEffect(() => {
    console.log('=== 選択された体験の地図表示チェック ===');
    console.log('map:', !!map);
    console.log('selectedExperience:', selectedExperience);
    console.log('searchLocation:', searchLocation);
    console.log('条件チェック結果:', !map || !selectedExperience || searchLocation);

    if (!map || !selectedExperience || searchLocation) {
      console.log('選択された体験の地図表示をスキップ');
      return;
    }

    console.log('選択された体験の地図表示:', selectedExperience);

    // 地図の中心を選択された体験の位置に移動
    map.setCenter({ lat: selectedExperience.latitude, lng: selectedExperience.longitude });
    map.setZoom(16); // 体験選択時は詳細表示のためズームレベルを上げる

    // 選択された体験のマーカーを強調表示するために、対応するインフォウィンドウを自動で開く
    setTimeout(() => {
      const selectedMarker = experienceMarkersRef.current.find(m => {
        const position = m.marker.getPosition();
        return Math.abs(position.lat() - selectedExperience.latitude) < 0.00001 &&
               Math.abs(position.lng() - selectedExperience.longitude) < 0.00001;
      });

      if (selectedMarker) {
        // ラベルを非表示にする
        experienceMarkersRef.current.forEach(m => {
          if (m.label && mapFilters.showLabels) {
            m.label.close();
          }
        });

        // 選択された体験のインフォウィンドウを開く
        const generateInfoWindowContent = (exp: any) => {
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
              <div style="padding: 8px; background-color: #e0f2fe; border-radius: 6px; border: 2px solid #0288d1;">
                <div style="color: #01579b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">✅ 選択中の体験</div>
                <div style="color: #0277bd; font-size: 11px;">この体験が一覧で選択されています</div>
              </div>
              <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                <div style="color: #6b7280; font-size: 12px; text-align: center;">
                  クリックして詳細を確認
                </div>
              </div>
            </div>
          `;
        };

        selectedMarker.infoWindow.setContent(generateInfoWindowContent(selectedExperience));
        openInfoWindow(selectedMarker.infoWindow, selectedMarker.marker);
      }
    }, 300);

  }, [map, selectedExperience, searchLocation, mapFilters.showLabels]);

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
        maxWidth: 380,
        pixelOffset: new window.google.maps.Size(0, -15), // 少し上にずらして重なりを防ぐ
        zIndex: 9999  // 最前面に表示
      });

      marker.addListener('click', () => {
        console.log(`マーカークリック: ${experience.category} (ID: ${experience.id})`, experience);

        // 新しいコンテンツで更新（最新のデータを確実に表示）
        infoWindow.setContent(generateInfoWindowContent(experience));
        openInfoWindow(infoWindow, marker);

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

    // 店舗情報がある体験のInfoWindowを自動で開く（検索場所がない場合のみ）
    if (experienceWithPlaceInfo && !searchLocation) {
      setTimeout(() => {
        console.log('店舗情報がある体験を自動表示:', experienceWithPlaceInfo.experience);

        // 他のInfoWindowを閉じ、ラベルを非表示にする
        markers.forEach(m => {
          if (m.label && mapFilters.showLabels) {
            m.label.close();
          }
        });

        // 店舗情報がある体験のInfoWindowを開く
        experienceWithPlaceInfo.infoWindow.setContent(generateInfoWindowContent(experienceWithPlaceInfo.experience));
        openInfoWindow(experienceWithPlaceInfo.infoWindow, experienceWithPlaceInfo.marker);

      }, 500); // 地図の読み込み完了を待つ
    } else if (searchLocation) {
      console.log('検索場所が設定されているため、体験の自動表示をスキップ');
    }

  }, [map, experiences, mapFilters, searchLocation]);

  // InfoWindow最前面表示のためのスタイルを動的に挿入
  useEffect(() => {
    const styleId = 'infowindow-z-index-style';

    // 既存のスタイルがあれば削除
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // 新しいスタイルを追加
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .gm-ui-hover-effect,
      .gm-style-iw,
      .gm-style-iw-c,
      .gm-style-iw-d,
      div[style*="position: absolute"][style*="z-index"] {
        z-index: 9999 !important;
      }

      /* 詳細情報を含むInfoWindowを特に強調 */
      div[style*="position: absolute"]:has(.gm-ui-hover-effect) {
        z-index: 10000 !important;
      }

      /* Google Maps InfoWindowの基本クラス */
      .gm-style .gm-style-iw-chr {
        z-index: 10001 !important;
      }
    `;
    document.head.appendChild(style);

    // クリーンアップ
    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        styleToRemove.remove();
      }
    };
  }, []);

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