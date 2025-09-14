'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { getPlaceInfoOptimized } from './optimized-places-lookup';

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
    
    setSubmitError(null);
    setSubmitSuccess(false);
    
    if (!selectedLocation) {
      setSubmitError('地図上で場所を選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // 最適化されたGoogle Places APIから詳細情報を取得
      let placeDetails = null;
      if (selectedLocation.address && window.google?.maps?.places) {
        try {
          console.log('最適化されたPlaces APIから詳細情報を取得中...');
          const optimizedResult = await getPlaceInfoOptimized(
            selectedLocation.address,
            { lat: selectedLocation.lat, lng: selectedLocation.lng }
          );

          if (optimizedResult) {
            placeDetails = {
              place_id: optimizedResult.place_id,
              name: optimizedResult.place_name,
              website: optimizedResult.website,
              url: optimizedResult.google_url,
              international_phone_number: optimizedResult.phone
            };
            console.log('最適化されたPlace詳細情報取得成功:', placeDetails);
          }
        } catch (error) {
          console.log('最適化Places API情報取得エラー:', error);
          // フォールバックとして従来の方法を使用
          if (window.google?.maps?.places) {
            try {
              console.log('フォールバック: 従来のGoogle Places APIを使用');
              const service = new window.google.maps.places.PlacesService(document.createElement('div'));
              const geocoder = new window.google.maps.Geocoder();

              const geocodeResult = await new Promise<any>((resolve) => {
                geocoder.geocode({ address: selectedLocation.address }, (results, status) => {
                  if (status === 'OK' && results?.[0]) {
                    resolve(results[0]);
                  } else {
                    resolve(null);
                  }
                });
              });

              if (geocodeResult && geocodeResult.place_id) {
                placeDetails = await new Promise<any>((resolve) => {
                  service.getDetails({
                    placeId: geocodeResult.place_id,
                    fields: ['name', 'website', 'url', 'international_phone_number', 'place_id']
                  }, (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
                      resolve(place);
                    } else {
                      resolve(null);
                    }
                  });
                });
              }
            } catch (fallbackError) {
              console.log('フォールバックPlaces API情報取得エラー:', fallbackError);
            }
          }
        }
      }

      // 匿名ユーザーでの投稿を可能にする（user_idをnullで投稿）
      const insertData: any = {
        user_id: null, // 匿名投稿
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.address,
        category: formData.category,
        rating: formData.rating,
        age_group: formData.ageGroup,
        gender: formData.gender,
        time_of_day: formData.timeOfDay
      };

      // Places API情報がある場合は追加
      if (placeDetails) {
        insertData.place_id = placeDetails.place_id || null;
        insertData.place_name = placeDetails.name || null;
        insertData.website = placeDetails.website || null;
        insertData.google_url = placeDetails.url || null;
        insertData.phone = placeDetails.international_phone_number || null;
      }

      const { error } = await supabase
        .from('experiences')
        .insert(insertData);

      if (error) {
        throw new Error(`投稿に失敗しました: ${error.message}`);
      }
      
      setSubmitSuccess(true);
      // フォームをリセット
      setFormData({
        category: '',
        rating: 5,
        ageGroup: '',
        gender: '',
        timeOfDay: ''
      });
      
      // 成功メッセージを3秒後に消す
      setTimeout(() => setSubmitSuccess(false), 3000);
      
      onSubmitSuccess?.();
    } catch (error) {
      console.error('投稿エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '投稿に失敗しました';
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
      {/* 成功メッセージ */}
      {submitSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-green-500 mr-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-green-700 font-medium">投稿が完了しました！</p>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="text-red-500 mr-2 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="location" className="text-xs sm:text-sm font-medium">
          選択した場所
        </Label>
        {selectedLocation ? (
          <div className="p-2 bg-green-50 rounded text-xs sm:text-sm">
            <p>📍 {selectedLocation.address || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}</p>
          </div>
        ) : (
          <div className="p-2 bg-gray-50 rounded text-xs sm:text-sm text-gray-500">
            地図をクリックして場所を選択してください
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="category" className="text-xs sm:text-sm font-medium">
          カテゴリ *
        </Label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded mt-1 text-sm"
          required
        >
          <option value="">選択してください</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="rating" className="text-xs sm:text-sm font-medium">
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
        <Label htmlFor="ageGroup" className="text-xs sm:text-sm font-medium">
          年代 *
        </Label>
        <select
          id="ageGroup"
          value={formData.ageGroup}
          onChange={(e) => setFormData(prev => ({ ...prev, ageGroup: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded mt-1 text-sm"
          required
        >
          <option value="">選択してください</option>
          {ageGroups.map(age => (
            <option key={age} value={age}>{age}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="gender" className="text-xs sm:text-sm font-medium">
          性別 *
        </Label>
        <select
          id="gender"
          value={formData.gender}
          onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded mt-1 text-sm"
          required
        >
          <option value="">選択してください</option>
          {genders.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="timeOfDay" className="text-xs sm:text-sm font-medium">
          時間帯 *
        </Label>
        <select
          id="timeOfDay"
          value={formData.timeOfDay}
          onChange={(e) => setFormData(prev => ({ ...prev, timeOfDay: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded mt-1 text-sm"
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