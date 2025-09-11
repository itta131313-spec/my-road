'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface FilterOptions {
  categories: string[];
  ageGroups: string[];
  genders: string[];
  timeOfDay: string[];
  minRating: number;
  maxDistance?: number; // km単位
  sortBy: 'rating' | 'distance' | 'created_at' | 'age_group' | 'gender';
  sortOrder: 'asc' | 'desc';
}

interface ExperienceFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  selectedLocation?: { lat: number; lng: number } | null;
  availableCategories: string[];
}

const categories = [
  '居酒屋', 'カフェ', 'レストラン', 'ラーメン', '銭湯', 'サウナ',
  '公園', '美術館', 'ショッピング', 'その他'
];

const ageGroups = ['10代', '20代', '30代', '40代', '50代', '60代以上'];
const genders = ['男性', '女性', 'その他'];
const timeOptions = ['朝', '昼', '夜', '深夜'];

export default function ExperienceFilter({ 
  onFilterChange, 
  selectedLocation, 
  availableCategories 
}: ExperienceFilterProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    ageGroups: [],
    genders: [],
    timeOfDay: [],
    minRating: 1,
    maxDistance: selectedLocation ? 5 : undefined, // デフォルト5km
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const toggleArrayFilter = (array: string[], value: string) => {
    return array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterOptions = {
      categories: [],
      ageGroups: [],
      genders: [],
      timeOfDay: [],
      minRating: 1,
      maxDistance: selectedLocation ? 5 : undefined,
      sortBy: 'created_at',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    return filters.categories.length + 
           filters.ageGroups.length + 
           filters.genders.length + 
           filters.timeOfDay.length +
           (filters.minRating > 1 ? 1 : 0) +
           (filters.maxDistance && filters.maxDistance < 50 ? 1 : 0);
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            絞り込み・ソート
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▲' : '▼'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
              >
                クリア
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* ソート */}
          <div>
            <h4 className="font-medium text-sm mb-2">並び順</h4>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilters({ 
                  sortBy: e.target.value as FilterOptions['sortBy']
                })}
                className="p-2 border rounded text-sm"
              >
                <option value="created_at">投稿日時</option>
                <option value="rating">評価</option>
                <option value="age_group">年代</option>
                <option value="gender">性別</option>
                {selectedLocation && <option value="distance">距離</option>}
              </select>
              <select
                value={filters.sortOrder}
                onChange={(e) => updateFilters({ 
                  sortOrder: e.target.value as 'asc' | 'desc'
                })}
                className="p-2 border rounded text-sm"
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </div>
          </div>

          {/* カテゴリ */}
          <div>
            <h4 className="font-medium text-sm mb-2">カテゴリ</h4>
            <div className="flex flex-wrap gap-2">
              {categories.filter(cat => availableCategories.includes(cat) || availableCategories.length === 0).map(category => (
                <button
                  key={category}
                  onClick={() => updateFilters({
                    categories: toggleArrayFilter(filters.categories, category)
                  })}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    filters.categories.includes(category)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* 評価 */}
          <div>
            <h4 className="font-medium text-sm mb-2">
              最低評価: {filters.minRating}★以上
            </h4>
            <input
              type="range"
              min="1"
              max="5"
              value={filters.minRating}
              onChange={(e) => updateFilters({ minRating: Number(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1★</span>
              <span>5★</span>
            </div>
          </div>

          {/* 距離 */}
          <div>
            <h4 className="font-medium text-sm mb-2">
              距離: {filters.maxDistance ? `${filters.maxDistance}km以内` : '制限なし'}
              {!selectedLocation && (
                <span className="text-xs text-orange-600 ml-2">
                  （地図で場所を選択すると有効）
                </span>
              )}
            </h4>
            <input
              type="range"
              min="0.5"
              max="50"
              step="0.5"
              value={filters.maxDistance || 50}
              onChange={(e) => updateFilters({ 
                maxDistance: Number(e.target.value) 
              })}
              className="w-full"
              disabled={!selectedLocation}
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0.5km</span>
              <span>50km</span>
            </div>
            {!selectedLocation && (
              <p className="text-xs text-gray-500 mt-1">
                地図をクリックして場所を選択すると、その場所からの距離で絞り込みができます。
              </p>
            )}
          </div>

          {/* 時間帯 */}
          <div>
            <h4 className="font-medium text-sm mb-2">時間帯</h4>
            <div className="grid grid-cols-4 gap-2">
              {timeOptions.map(time => (
                <button
                  key={time}
                  onClick={() => updateFilters({
                    timeOfDay: toggleArrayFilter(filters.timeOfDay, time)
                  })}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    filters.timeOfDay.includes(time)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* 年代 */}
          <div>
            <h4 className="font-medium text-sm mb-2">年代</h4>
            <div className="grid grid-cols-3 gap-2">
              {ageGroups.map(age => (
                <button
                  key={age}
                  onClick={() => updateFilters({
                    ageGroups: toggleArrayFilter(filters.ageGroups, age)
                  })}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    filters.ageGroups.includes(age)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* 性別 */}
          <div>
            <h4 className="font-medium text-sm mb-2">性別</h4>
            <div className="grid grid-cols-3 gap-2">
              {genders.map(gender => (
                <button
                  key={gender}
                  onClick={() => updateFilters({
                    genders: toggleArrayFilter(filters.genders, gender)
                  })}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    filters.genders.includes(gender)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {gender}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}