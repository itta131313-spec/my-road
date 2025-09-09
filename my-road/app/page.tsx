'use client';

import { useState, useEffect } from "react";
import { ClientAuthButton } from "@/components/client-auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import GoogleMap from "@/components/map/google-map";
import ExperienceForm from "@/components/experience/experience-form";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);
  
  const [experiences, setExperiences] = useState<Array<{
    id: string;
    latitude: number;
    longitude: number;
    category: string;
    rating: number;
    address?: string;
  }>>([]);

  const supabase = createClient();

  // 体験データを取得
  const fetchExperiences = async () => {
    try {
      const { data, error } = await supabase
        .from('experiences')
        .select('id, latitude, longitude, category, rating, address')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('体験データの取得エラー:', error);
      } else {
        setExperiences(data || []);
      }
    } catch (error) {
      console.error('体験データの取得エラー:', error);
    }
  };

  useEffect(() => {
    fetchExperiences();
  }, []);
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <nav className="w-full border-b border-b-foreground/10 h-16 flex-shrink-0">
        <div className="w-full h-full flex justify-between items-center px-6">
          <div className="flex gap-5 items-center font-semibold">
            <Link href={"/"} className="text-xl">My Road</Link>
            <span className="text-sm text-gray-600">地図体験共有アプリ</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {hasEnvVars && <ClientAuthButton />}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map Section */}
        <div className="flex-1 p-4">
          <div className="h-full">
            <h1 className="text-2xl font-bold mb-4">周辺の体験を探す</h1>
            <p className="text-gray-600 mb-4">地図をクリックして場所を指定してください</p>
            <GoogleMap 
              onLocationSelect={setSelectedLocation}
              experiences={experiences}
            />
          </div>
        </div>

        {/* Sidebar - 体験投稿フォーム */}
        <div className="w-80 border-l border-gray-200 p-4 bg-gray-50 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">体験を投稿</h2>
          <ExperienceForm 
            selectedLocation={selectedLocation}
            onSubmitSuccess={() => {
              // 投稿成功時に選択場所をリセット & 体験データを再取得
              setSelectedLocation(null);
              fetchExperiences();
            }}
          />
        </div>
      </div>
    </main>
  );
}
