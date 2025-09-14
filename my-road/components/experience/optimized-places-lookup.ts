// Google Places API使用量を最適化する関数
import { checkPlacesApiUsage } from './places-api-limiter';

interface PlaceInfo {
  place_id?: string | null;
  place_name?: string | null;
  website?: string | null;
  google_url?: string | null;
  phone?: string | null;
}

// ローカルキャッシュでAPI呼び出し回数を削減
const placeCache = new Map<string, PlaceInfo>();

export async function getPlaceInfoOptimized(
  address: string,
  coordinates: { lat: number; lng: number }
): Promise<PlaceInfo | null> {

  // 1. ローカルキャッシュをチェック
  const cacheKey = `${coordinates.lat},${coordinates.lng}`;
  if (placeCache.has(cacheKey)) {
    console.log('Places情報をキャッシュから取得');
    return placeCache.get(cacheKey)!;
  }

  // 2. 使用量制限確認とユーザー同意
  const { canUse, userConsent } = checkPlacesApiUsage();

  if (!canUse || !userConsent) {
    // Places APIを使用しない場合でも基本情報は提供
    const basicInfo: PlaceInfo = {
      place_id: null,
      place_name: null,
      website: null,
      google_url: `https://www.google.com/maps/place/${encodeURIComponent(address || '選択した場所')}/@${coordinates.lat},${coordinates.lng},17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d${coordinates.lat}!4d${coordinates.lng}`,
      phone: null
    };

    // キャッシュに保存（同じ場所で再度聞かれることを防ぐ）
    placeCache.set(cacheKey, basicInfo);
    return basicInfo;
  }

  try {
    // 3. 効率的なAPI呼び出し
    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );

    // 座標から直接検索（Geocoding APIを省略）
    const nearbyResults = await new Promise<any>((resolve) => {
      service.nearbySearch({
        location: coordinates,
        radius: 50, // 50m以内
        type: 'establishment'
      }, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });

    if (!nearbyResults) return null;

    // 詳細情報を取得
    const placeDetails = await new Promise<any>((resolve) => {
      service.getDetails({
        placeId: nearbyResults.place_id,
        fields: ['name', 'website', 'url', 'international_phone_number', 'place_id']
      }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(place);
        } else {
          resolve(null);
        }
      });
    });

    const result: PlaceInfo = {
      place_id: placeDetails?.place_id || null,
      place_name: placeDetails?.name || null,
      website: placeDetails?.website || null,
      google_url: placeDetails?.url || null,
      phone: placeDetails?.international_phone_number || null,
    };

    // キャッシュに保存
    placeCache.set(cacheKey, result);

    return result;

  } catch (error) {
    console.error('Places API最適化エラー:', error);
    return null;
  }
}

// 使用統計を表示する関数
export function showPlacesApiUsage() {
  const usage = {
    cacheHits: placeCache.size,
    estimatedMonthlyCost: placeCache.size * 0.02, // $0.02 per request estimate
  };

  console.log('Places API使用統計:', usage);
  return usage;
}