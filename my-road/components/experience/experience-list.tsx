'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  onExperienceSelect 
}: ExperienceListProps) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [filteredExperiences, setFilteredExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // 体験データを取得
  const fetchExperiences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('体験データの取得エラー:', error);
      } else {
        setExperiences(data || []);
      }
    } catch (error) {
      console.error('体験データの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...experiences];

    // カテゴリフィルタ
    if (filters.categories.length > 0) {
      filtered = filtered.filter(exp => 
        filters.categories.includes(exp.category)
      );
    }

    // 年代フィルタ
    if (filters.ageGroups.length > 0) {
      filtered = filtered.filter(exp => 
        filters.ageGroups.includes(exp.age_group)
      );
    }

    // 性別フィルタ
    if (filters.genders.length > 0) {
      filtered = filtered.filter(exp => 
        filters.genders.includes(exp.gender)
      );
    }

    // 時間帯フィルタ
    if (filters.timeOfDay.length > 0) {
      filtered = filtered.filter(exp => 
        filters.timeOfDay.includes(exp.time_of_day)
      );
    }

    // 評価フィルタ
    if (filters.minRating > 1) {
      filtered = filtered.filter(exp => 
        exp.rating >= filters.minRating
      );
    }

    // 距離フィルタ（選択された場所がある場合）
    if (selectedLocation && filters.maxDistance) {
      filtered = filtered.filter(exp => {
        const distance = calculateDistance(
          selectedLocation.lat, selectedLocation.lng,
          exp.latitude, exp.longitude
        );
        return distance <= filters.maxDistance!;
      });
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
          if (selectedLocation) {
            const distanceA = calculateDistance(
              selectedLocation.lat, selectedLocation.lng,
              a.latitude, a.longitude
            );
            const distanceB = calculateDistance(
              selectedLocation.lat, selectedLocation.lng,
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

    setFilteredExperiences(filtered);
  }, [experiences, filters, selectedLocation]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDistance = (lat: number, lng: number) => {
    if (!selectedLocation) return null;
    const distance = calculateDistance(
      selectedLocation.lat, selectedLocation.lng,
      lat, lng
    );
    return distance < 1 
      ? `${Math.round(distance * 1000)}m` 
      : `${distance.toFixed(1)}km`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          体験一覧 ({filteredExperiences.length}件)
        </h3>
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
        <div className="space-y-2">
          {filteredExperiences.map((experience) => (
            <Card 
              key={experience.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onExperienceSelect?.(experience)}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
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
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{formatDate(experience.created_at)}</div>
                    {selectedLocation && (
                      <div className="mt-1 font-medium text-blue-600">
                        {formatDistance(experience.latitude, experience.longitude)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}