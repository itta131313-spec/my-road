// 2点間の距離を計算（ハーバーサイン公式を使用）
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球の半径（km）
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // 距離（km）
  
  return distance;
}

// 体験配列を指定地点からの距離順でソート
export function sortExperiencesByDistance(
  experiences: Array<{
    id: string;
    latitude: number;
    longitude: number;
    category: string;
    rating: number;
    address?: string;
  }>,
  referencePoint: { lat: number; lng: number }
): Array<{
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  address?: string;
  distance?: number;
}> {
  return experiences
    .map(exp => ({
      ...exp,
      distance: calculateDistance(
        referencePoint.lat,
        referencePoint.lng,
        exp.latitude,
        exp.longitude
      )
    }))
    .sort((a, b) => a.distance - b.distance);
}

// 距離を読みやすい形式でフォーマット
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else {
    return `${distance.toFixed(1)}km`;
  }
}