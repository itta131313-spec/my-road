// Places API使用量制限管理
interface ApiUsageStats {
  currentMonth: string;
  requestCount: number;
  maxRequests: number;
}

const STORAGE_KEY = 'places_api_usage';
const MAX_FREE_REQUESTS = 100; // 月間100回まで無料

// 現在の月を取得（YYYY-MM形式）
function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 使用量統計を取得
function getUsageStats(): ApiUsageStats {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const stats: ApiUsageStats = JSON.parse(stored);
      const currentMonth = getCurrentMonth();

      // 月が変わった場合はリセット
      if (stats.currentMonth !== currentMonth) {
        const newStats: ApiUsageStats = {
          currentMonth: currentMonth,
          requestCount: 0,
          maxRequests: MAX_FREE_REQUESTS
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
        return newStats;
      }

      return stats;
    }
  } catch (error) {
    console.error('使用量統計の取得エラー:', error);
  }

  // デフォルト値
  const defaultStats: ApiUsageStats = {
    currentMonth: getCurrentMonth(),
    requestCount: 0,
    maxRequests: MAX_FREE_REQUESTS
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStats));
  return defaultStats;
}

// 使用量を1増加
function incrementUsage(): boolean {
  try {
    const stats = getUsageStats();
    stats.requestCount += 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));

    console.log(`Places API使用量: ${stats.requestCount}/${stats.maxRequests} (${getCurrentMonth()})`);
    return true;
  } catch (error) {
    console.error('使用量更新エラー:', error);
    return false;
  }
}

// 使用可能かチェック
export function canUsePlacesApi(): boolean {
  const stats = getUsageStats();
  return stats.requestCount < stats.maxRequests;
}

// 使用量制限確認とユーザー同意
export function checkPlacesApiUsage(): { canUse: boolean; userConsent: boolean } {
  const stats = getUsageStats();
  const remainingRequests = stats.maxRequests - stats.requestCount;

  if (remainingRequests <= 0) {
    alert(
      '🚫 Places API月間制限に達しました\n\n' +
      `今月の使用量: ${stats.requestCount}/${stats.maxRequests}\n` +
      '来月まで詳細情報の取得ができません。\n\n' +
      'Google Mapsリンクは引き続き利用できます。'
    );
    return { canUse: false, userConsent: false };
  }

  const userConsent = confirm(
    '📍 この場所の詳細情報を取得しますか？\n\n' +
    '✅ 取得される情報:\n' +
    '  • ホームページURL\n' +
    '  • 電話番号\n' +
    '  • 正確な店舗名\n\n' +
    '⚠️  Google Places API使用状況:\n' +
    `    今月の残り: ${remainingRequests}/${stats.maxRequests}回\n\n` +
    '「いいえ」を選択した場合でも\n' +
    'Google Mapsリンクは無料で提供されます。'
  );

  if (userConsent) {
    incrementUsage();
  }

  return { canUse: true, userConsent };
}

// 使用量統計を表示
export function showPlacesApiUsage(): ApiUsageStats {
  const stats = getUsageStats();

  console.log('=== Places API使用統計 ===');
  console.log(`期間: ${stats.currentMonth}`);
  console.log(`使用量: ${stats.requestCount}/${stats.maxRequests}`);
  console.log(`残り: ${stats.maxRequests - stats.requestCount}`);

  const percentage = Math.round((stats.requestCount / stats.maxRequests) * 100);
  console.log(`使用率: ${percentage}%`);

  if (stats.requestCount >= stats.maxRequests * 0.8) {
    console.warn('⚠️ 使用量が80%を超えました。計画的にご利用ください。');
  }

  return stats;
}

// 月間リセット日を確認
export function getNextResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}