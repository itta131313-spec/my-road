'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sortExperiencesByDistance, formatDistance } from '@/lib/distance-utils';

interface Experience {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  rating: number;
  address?: string;
}

interface RouteFormProps {
  experiences: Experience[];
  onSubmitSuccess?: () => void;
  searchLocation?: {
    lat: number;
    lng: number;
    address: string;
    name?: string;
  } | null;
}

const ageGroups = ['10代', '20代', '30代', '40代', '50代', '60代以上'];
const genders = ['男性', '女性', 'その他'];

export default function RouteForm({ experiences, onSubmitSuccess, searchLocation }: RouteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedExperiences, setSelectedExperiences] = useState<Experience[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ageGroup: '',
    gender: '',
    overallRating: 5
  });
  const [stepData, setStepData] = useState<Array<{
    experienceId: string;
    durationMinutes: number;
    travelTimeToNext: number;
    notes: string;
  }>>([]);

  const supabase = createClient();

  // 検索地点に基づいて距離順でソートされた体験リスト
  const [sortedExperiences, setSortedExperiences] = useState<Array<Experience & { distance?: number }>>(experiences);

  // 検索地点が変更された時、体験を距離順でソート
  useEffect(() => {
    if (searchLocation && experiences.length > 0) {
      const sorted = sortExperiencesByDistance(experiences, searchLocation);
      setSortedExperiences(sorted);
    } else {
      setSortedExperiences(experiences);
    }
  }, [searchLocation, experiences]);

  // 選択された体験に応じてステップデータを初期化
  useEffect(() => {
    const newStepData = selectedExperiences.map((exp, index) => ({
      experienceId: exp.id,
      durationMinutes: 60, // デフォルト60分
      travelTimeToNext: index === selectedExperiences.length - 1 ? 0 : 15, // 最後以外は15分
      notes: ''
    }));
    setStepData(newStepData);
  }, [selectedExperiences]);

  const handleExperienceSelect = (experience: Experience) => {
    if (selectedExperiences.find(exp => exp.id === experience.id)) {
      // 既に選択されている場合は削除
      setSelectedExperiences(prev => prev.filter(exp => exp.id !== experience.id));
    } else {
      // 新規追加
      setSelectedExperiences(prev => [...prev, experience]);
    }
  };

  const moveExperience = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedExperiences.length) return;
    
    const newExperiences = [...selectedExperiences];
    const [moved] = newExperiences.splice(fromIndex, 1);
    newExperiences.splice(toIndex, 0, moved);
    setSelectedExperiences(newExperiences);
  };

  const updateStepData = (index: number, field: keyof typeof stepData[0], value: string | number) => {
    setStepData(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedExperiences.length < 2) {
      alert('少なくとも2つの体験を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // 総所要時間を計算
      const totalDuration = stepData.reduce((total, step) => 
        total + step.durationMinutes + step.travelTimeToNext, 0
      );

      // 匿名ユーザーでのルート作成を可能にする
      const { data: routeData, error: routeError } = await supabase
        .from('routes')
        .insert({
          user_id: null, // 匿名投稿
          title: formData.title,
          description: formData.description,
          total_duration: totalDuration,
          age_group: formData.ageGroup,
          gender: formData.gender,
          overall_rating: formData.overallRating
        })
        .select('id')
        .single();

      if (routeError || !routeData) {
        console.error('ルート作成エラー:', routeError);
        alert('ルートの作成に失敗しました');
        return;
      }

      // ルートステップを作成
      const routeSteps = stepData.map((step, index) => ({
        route_id: routeData.id,
        experience_id: step.experienceId,
        step_order: index + 1,
        duration_minutes: step.durationMinutes,
        travel_time_to_next: step.travelTimeToNext,
        notes: step.notes
      }));

      const { error: stepsError } = await supabase
        .from('route_steps')
        .insert(routeSteps);

      if (stepsError) {
        console.error('ルートステップ作成エラー:', stepsError);
        alert('ルートステップの作成に失敗しました');
        return;
      }

      alert('工程ルートが作成されました！');
      
      // フォームをリセット
      setFormData({
        title: '',
        description: '',
        ageGroup: '',
        gender: '',
        overallRating: 5
      });
      setSelectedExperiences([]);
      setStepData([]);
      
      onSubmitSuccess?.();

    } catch (error) {
      console.error('ルート作成エラー:', error);
      alert('ルートの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalTime = stepData.reduce((total, step) => total + step.durationMinutes + step.travelTimeToNext, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>工程ルート作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                ルートタイトル *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="例：銭湯→居酒屋コース"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                説明
              </Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="このルートの魅力やポイントを教えてください"
                className="w-full p-2 border border-gray-300 rounded mt-1 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ageGroup" className="text-sm font-medium">
                  年代 *
                </Label>
                <select
                  id="ageGroup"
                  value={formData.ageGroup}
                  onChange={(e) => setFormData(prev => ({ ...prev, ageGroup: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  required
                >
                  <option value="">選択してください</option>
                  {ageGroups.map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="gender" className="text-sm font-medium">
                  性別 *
                </Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded mt-1"
                  required
                >
                  <option value="">選択してください</option>
                  {genders.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="overallRating" className="text-sm font-medium">
                総合評価 * ({formData.overallRating}★)
              </Label>
              <input
                type="range"
                id="overallRating"
                min="1"
                max="5"
                step="0.5"
                value={formData.overallRating}
                onChange={(e) => setFormData(prev => ({ ...prev, overallRating: Number(e.target.value) }))}
                className="w-full mt-1"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            体験を選択 ({selectedExperiences.length}個選択済み)
            {searchLocation && (
              <div className="text-sm font-normal text-gray-600 mt-1">
                検索地点: {searchLocation.name || searchLocation.address} からの距離順
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sortedExperiences.map(exp => (
              <div
                key={exp.id}
                onClick={() => handleExperienceSelect(exp)}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedExperiences.find(e => e.id === exp.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium">{exp.category}</div>
                  {exp.distance !== undefined && (
                    <div className="text-xs text-blue-600 font-medium">
                      {formatDistance(exp.distance)}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {exp.rating}★ - {exp.address || `${exp.latitude.toFixed(4)}, ${exp.longitude.toFixed(4)}`}
                </div>
              </div>
            ))}
            {sortedExperiences.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                体験データがありません
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedExperiences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              ルート詳細設定 (総時間: {Math.floor(totalTime / 60)}時間{totalTime % 60}分)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedExperiences.map((exp, index) => (
                <div key={exp.id} className="border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">
                      {index + 1}. {exp.category}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => moveExperience(index, index - 1)}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => moveExperience(index, index + 1)}
                        disabled={index === selectedExperiences.length - 1}
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-xs">滞在時間 (分)</Label>
                      <Input
                        type="number"
                        value={stepData[index]?.durationMinutes || 0}
                        onChange={(e) => updateStepData(index, 'durationMinutes', Number(e.target.value))}
                        min="1"
                      />
                    </div>
                    {index < selectedExperiences.length - 1 && (
                      <div>
                        <Label className="text-xs">次への移動時間 (分)</Label>
                        <Input
                          type="number"
                          value={stepData[index]?.travelTimeToNext || 0}
                          onChange={(e) => updateStepData(index, 'travelTimeToNext', Number(e.target.value))}
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-2">
                    <Label className="text-xs">メモ</Label>
                    <Input
                      value={stepData[index]?.notes || ''}
                      onChange={(e) => updateStepData(index, 'notes', e.target.value)}
                      placeholder="このステップのポイントなど"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full mt-6"
              disabled={selectedExperiences.length < 2 || isSubmitting || !formData.title || !formData.ageGroup || !formData.gender}
            >
              {isSubmitting ? '作成中...' : '工程ルートを作成'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}