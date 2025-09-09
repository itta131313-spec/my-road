'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';

interface ExperienceFormProps {
  selectedLocation?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
  onSubmitSuccess?: () => void;
}

const categories = [
  '居酒屋', 'カフェ', 'レストラン', 'ラーメン', '銭湯', 'サウナ',
  '公園', '美術館', 'ショッピング', 'その他'
];

const ageGroups = ['10代', '20代', '30代', '40代', '50代', '60代以上'];
const genders = ['男性', '女性', 'その他'];
const timeOptions = ['朝', '昼', '夜', '深夜'];

export default function ExperienceForm({ selectedLocation, onSubmitSuccess }: ExperienceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    rating: 5,
    ageGroup: '',
    gender: '',
    timeOfDay: ''
  });

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLocation) {
      alert('地図上で場所を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('投稿するにはログインが必要です');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('experiences')
        .insert({
          user_id: user.id,
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          address: selectedLocation.address,
          category: formData.category,
          rating: formData.rating,
          age_group: formData.ageGroup,
          gender: formData.gender,
          time_of_day: formData.timeOfDay
        });

      if (error) {
        console.error('投稿エラー:', error);
        alert('投稿に失敗しました');
      } else {
        alert('投稿が完了しました！');
        // フォームをリセット
        setFormData({
          category: '',
          rating: 5,
          ageGroup: '',
          gender: '',
          timeOfDay: ''
        });
        onSubmitSuccess?.();
      }
    } catch (error) {
      console.error('投稿エラー:', error);
      alert('投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="location" className="text-sm font-medium">
          選択した場所
        </Label>
        {selectedLocation ? (
          <div className="p-2 bg-green-50 rounded text-sm">
            <p>📍 {selectedLocation.address || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}</p>
          </div>
        ) : (
          <div className="p-2 bg-gray-50 rounded text-sm text-gray-500">
            地図をクリックして場所を選択してください
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="category" className="text-sm font-medium">
          カテゴリ *
        </Label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded mt-1"
          required
        >
          <option value="">選択してください</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="rating" className="text-sm font-medium">
          評価 * ({formData.rating}★)
        </Label>
        <input
          type="range"
          id="rating"
          min="1"
          max="5"
          value={formData.rating}
          onChange={(e) => setFormData(prev => ({ ...prev, rating: Number(e.target.value) }))}
          className="w-full mt-1"
        />
        <div className="text-xs text-gray-500 flex justify-between">
          <span>1★</span>
          <span>5★</span>
        </div>
      </div>

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

      <div>
        <Label htmlFor="timeOfDay" className="text-sm font-medium">
          時間帯 *
        </Label>
        <select
          id="timeOfDay"
          value={formData.timeOfDay}
          onChange={(e) => setFormData(prev => ({ ...prev, timeOfDay: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded mt-1"
          required
        >
          <option value="">選択してください</option>
          {timeOptions.map(time => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={!selectedLocation || isSubmitting}
      >
        {isSubmitting ? '投稿中...' : '体験を投稿'}
      </Button>
    </form>
  );
}