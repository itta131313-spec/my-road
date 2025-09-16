'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface Experience {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  address?: string;
  age_group: string;
  gender: string;
  time_of_day: string;
  created_at: string;
  user_id: string;
}

interface FilterOptions {
  categories: string[];
  ageGroups: string[];
  genders: string[];
  timeOfDay: string[];
  minRating: number;
  maxDistance?: number;
  sortBy: 'rating' | 'distance' | 'created_at' | 'age_group' | 'gender';
  sortOrder: 'asc' | 'desc';
}

interface ExperienceListProps {
  filters: FilterOptions;
  selectedLocation?: { lat: number; lng: number } | null;
  onExperienceSelect?: (experience: Experience) => void;
  searchLocation?: {
    lat: number;
    lng: number;
    address: string;
    name?: string;
  } | null;
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

export default function ExperienceList({ 
  filters, 
  selectedLocation, 
  onExperienceSelect,
  searchLocation 
}: ExperienceListProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [filteredExperiences, setFilteredExperiences] = useState<Experience[]>([]);
  const [displayedExperiences, setDisplayedExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // ページあたりのアイテム数

  const supabase = createClient();

  // 体験データを取得
  const fetchExperiences = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
      }
      setError(null);

      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Supabase query result:', { data, error });
      console.log('Data length:', data?.length || 0);

      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`データの取得に失敗しました: ${error.message}`);
      }
      
      setExperiences(data || []);
      setRetryCount(0);
    } catch (error) {
      console.error('体験データの取得エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '体験データの取得に失敗しました';
      setError(errorMessage);
      
      // 3回まで自動リトライ
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchExperiences(true);
        }, 1000 * (retryCount + 1));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);

  // フィルタリング処理
  useEffect(() => {
    console.log('=== フィルタリング処理開始 ===');
    console.log('experiences:', experiences.length, '件');
    console.log('filters:', filters);
    console.log('filters.maxDistance:', filters.maxDistance, '(型:', typeof filters.maxDistance, ')');
    console.log('searchLocation:', searchLocation);
    console.log('selectedLocation:', selectedLocation);

    let filtered = [...experiences];

    // カテゴリフィルタ（空の場合は全て表示）
    if (filters.categories && filters.categories.length > 0) {
      console.log('カテゴリフィルタ適用前:', filtered.length, '件');
      filtered = filtered.filter(exp =>
        filters.categories.includes(exp.category)
      );
      console.log('カテゴリフィルタ適用後:', filtered.length, '件');
    }

    // 年代フィルタ（空の場合は全て表示）
    if (filters.ageGroups && filters.ageGroups.length > 0) {
      filtered = filtered.filter(exp =>
        filters.ageGroups.includes(exp.age_group)
      );
    }

    // 性別フィルタ（空の場合は全て表示）
    if (filters.genders && filters.genders.length > 0) {
      filtered = filtered.filter(exp =>
        filters.genders.includes(exp.gender)
      );
    }

    // 時間帯フィルタ（空の場合は全て表示）
    if (filters.timeOfDay && filters.timeOfDay.length > 0) {
      filtered = filtered.filter(exp =>
        filters.timeOfDay.includes(exp.time_of_day)
      );
    }

    // 評価フィルタ
    if (filters.minRating && filters.minRating > 1) {
      filtered = filtered.filter(exp =>
        exp.rating >= filters.minRating
      );
    }

    // 距離フィルタ（選択された場所または検索地点がある場合）
    const referenceLocation = searchLocation || selectedLocation;
    console.log('距離フィルタ referenceLocation:', referenceLocation);
    console.log('距離フィルタ filters.maxDistance:', filters.maxDistance);
    if (referenceLocation && filters.maxDistance !== undefined && filters.maxDistance !== null) {
      console.log('距離フィルタ適用前:', filtered.length, '件');
      filtered = filtered.filter(exp => {
        const distance = calculateDistance(
          referenceLocation.lat, referenceLocation.lng,
          exp.latitude, exp.longitude
        );
        const maxDist = Number(filters.maxDistance!);
        const result = distance <= maxDist;
        console.log(`体験 ${exp.id}: 距離 ${distance.toFixed(2)}km, 制限 ${maxDist}km (型: ${typeof maxDist}), 判定: ${result}, 比較: ${distance} <= ${maxDist}`);
        return result;
      });
      console.log('距離フィルタ適用後:', filtered.length, '件');
    } else {
      console.log('距離フィルタスキップ - 基準地点またはmaxDistanceなし');
    }

    // ソート処理
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'age_group':
          comparison = a.age_group.localeCompare(b.age_group);
          break;
        case 'gender':
          comparison = a.gender.localeCompare(b.gender);
          break;
        case 'distance':
          if (referenceLocation) {
            const distanceA = calculateDistance(
              referenceLocation.lat, referenceLocation.lng,
              a.latitude, a.longitude
            );
            const distanceB = calculateDistance(
              referenceLocation.lat, referenceLocation.lng,
              b.latitude, b.longitude
            );
            comparison = distanceA - distanceB;
          }
          break;
        default:
          comparison = 0;
      }

      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });

    console.log('フィルタリング後:', filtered.length, '件');
    console.log('=== フィルタリング処理終了 ===');
    
    setFilteredExperiences(filtered);
    setCurrentPage(1); // フィルタが変更されたらページを1に戻す
  }, [experiences, filters, selectedLocation, searchLocation]);

  // ページネーション処理
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedExperiences(filteredExperiences.slice(startIndex, endIndex));
  }, [filteredExperiences, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredExperiences.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // スクロールを上に戻す
    document.querySelector('.space-y-3')?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDistance = (lat: number, lng: number) => {
    const referenceLocation = searchLocation || selectedLocation;
    if (!referenceLocation) return null;
    const distance = calculateDistance(
      referenceLocation.lat, referenceLocation.lng,
      lat, lng
    );
    return distance < 1 
      ? `${Math.round(distance * 1000)}m` 
      : `${distance.toFixed(1)}km`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            体験一覧 {retryCount > 0 && `(リトライ中: ${retryCount}/3)`}
          </h3>
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">体験一覧</h3>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-red-600 font-medium mb-2">データの読み込みエラー</p>
            <p className="text-xs text-red-500 mb-4">{error}</p>
            <button 
              onClick={() => {
                setRetryCount(0);
                fetchExperiences();
              }}
              className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors"
            >
              再試行
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            体験一覧 ({filteredExperiences.length}件)
            {totalPages > 1 && (
              <span className="text-xs text-gray-500 ml-2">
                {currentPage}/{totalPages}ページ
              </span>
            )}
          </h3>
        </div>
        {searchLocation && (
          <div className="text-xs text-gray-600">
            検索地点: {searchLocation.name || searchLocation.address} からの距離順
          </div>
        )}
      </div>

      {filteredExperiences.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            {experiences.length === 0 
              ? 'まだ体験が投稿されていません'
              : '条件に合う体験が見つかりません'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {displayedExperiences.map((experience) => (
              <Card
                key={experience.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <Link
                        href={`/experience/${experience.id}`}
                        className="block hover:text-blue-600 transition-colors"
                      >
                        <div className="font-medium text-sm">{experience.category}</div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                          <span>{experience.rating}★</span>
                          <Badge variant="secondary" className="text-xs">
                            {experience.age_group}・{experience.gender}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {experience.time_of_day}
                          </Badge>
                        </div>
                        {experience.address && (
                          <div className="text-xs text-gray-500 mt-1">
                            {experience.address.slice(0, 30)}
                            {experience.address.length > 30 ? '...' : ''}
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>{formatDate(experience.created_at)}</div>
                      {(searchLocation || selectedLocation) && (
                        <div className="mt-1 font-medium text-blue-600">
                          {formatDistance(experience.latitude, experience.longitude)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onExperienceSelect?.(experience)}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      地図で表示
                    </button>
                    <Link
                      href={`/experience/${experience.id}`}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      詳細を見る
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-2 py-1 rounded text-xs ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                前へ
              </button>
              
              {/* ページ番号 */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const startPage = Math.max(1, currentPage - 2);
                const pageNumber = startPage + i;
                if (pageNumber > totalPages) return null;
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`px-2 py-1 rounded text-xs ${
                      currentPage === pageNumber
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-2 py-1 rounded text-xs ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}