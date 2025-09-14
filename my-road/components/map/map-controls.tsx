'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MapControlsProps {
  onFiltersChange: (filters: {
    categories: string[];
    minRating: number;
    sortBy: string;
    showLabels: boolean;
  }) => void;
  availableCategories: string[];
}

const categories = [
  '居酒屋', 'カフェ', 'レストラン', 'ラーメン', '銭湯', 'サウナ',
  '公園', '美術館', 'ショッピング', 'その他'
];

export default function MapControls({ onFiltersChange, availableCategories }: MapControlsProps) {
  const [filters, setFilters] = useState({
    categories: [] as string[],
    minRating: 1,
    sortBy: 'rating',
    showLabels: true
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange(updated);
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const clearFilters = () => {
    const cleared = {
      categories: [],
      minRating: 1,
      sortBy: 'rating',
      showLabels: true
    };
    setFilters(cleared);
    onFiltersChange(cleared);
  };

  const getActiveFiltersCount = () => {
    return filters.categories.length + (filters.minRating > 1 ? 1 : 0);
  };

  return (
    <Card className="absolute top-16 left-2 z-10 bg-white/95 backdrop-blur shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm flex items-center gap-2">
            地図フィルター
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="text-xs">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 h-auto"
            >
              {isExpanded ? '▲' : '▼'}
            </Button>
            {getActiveFiltersCount() > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-xs px-2 py-1 h-auto"
              >
                クリア
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3 max-w-xs">
          {/* ラベル表示切替 */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.showLabels}
                onChange={(e) => updateFilters({ showLabels: e.target.checked })}
                className="rounded"
              />
              ラベル表示
            </label>
          </div>

          {/* カテゴリフィルター */}
          <div>
            <h4 className="text-xs font-medium mb-2 text-gray-700">カテゴリ</h4>
            <div className="grid grid-cols-2 gap-1">
              {categories.filter(cat => availableCategories.includes(cat) || availableCategories.length === 0).map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
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

          {/* 評価フィルター */}
          <div>
            <h4 className="text-xs font-medium mb-2 text-gray-700">
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

          {/* ソート */}
          <div>
            <h4 className="text-xs font-medium mb-2 text-gray-700">並び順</h4>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="w-full p-1 border rounded text-xs"
            >
              <option value="rating">評価順</option>
              <option value="category">カテゴリ順</option>
              <option value="created_at">投稿日時順</option>
            </select>
          </div>
        </CardContent>
      )}
    </Card>
  );
}