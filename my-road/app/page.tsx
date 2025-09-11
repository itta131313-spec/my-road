'use client';

import { useState, useEffect } from "react";
import { ClientAuthButton } from "@/components/client-auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import GoogleMap from "@/components/map/google-map";
import ExperienceForm from "@/components/experience/experience-form";
import ExperienceList from "@/components/experience/experience-list";
import ExperienceFilter from "@/components/filter/experience-filter";
import RouteForm from "@/components/route/route-form";
import RouteList from "@/components/route/route-list";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

  const [activeTab, setActiveTab] = useState<'experience' | 'route' | 'routes' | 'search'>('experience');
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [filters, setFilters] = useState<any>({
    categories: [],
    ageGroups: [],
    genders: [],
    timeOfDay: [],
    minRating: 1,
    maxDistance: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [selectedExperience, setSelectedExperience] = useState<any>(null);

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
              selectedRoute={selectedRoute}
              selectedExperience={selectedExperience}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex">
              <button
                onClick={() => setActiveTab('experience')}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'experience'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                体験投稿
              </button>
              <button
                onClick={() => setActiveTab('route')}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'route'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ルート作成
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'routes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ルート一覧
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 ${
                  activeTab === 'search'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                体験検索
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'experience' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">体験を投稿</h2>
                <ExperienceForm 
                  selectedLocation={selectedLocation}
                  onSubmitSuccess={() => {
                    setSelectedLocation(null);
                    fetchExperiences();
                  }}
                />
              </div>
            )}

            {activeTab === 'route' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">工程ルート作成</h2>
                <RouteForm 
                  experiences={experiences}
                  onSubmitSuccess={() => {
                    setActiveTab('routes');
                    fetchExperiences();
                  }}
                />
              </div>
            )}

            {activeTab === 'routes' && (
              <div>
                <RouteList 
                  selectedLocation={selectedLocation}
                  onRouteSelect={(route) => {
                    setSelectedRoute(route);
                    setSelectedExperience(null);
                  }}
                />
                {selectedRoute && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-blue-800">選択中のルート</h4>
                      <button
                        onClick={() => setSelectedRoute(null)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        クリア
                      </button>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">{selectedRoute.title}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'search' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">体験を検索・絞り込み</h2>
                
                <ExperienceFilter 
                  onFilterChange={setFilters}
                  selectedLocation={selectedLocation}
                  availableCategories={experiences.map(exp => exp.category)}
                />

                <ExperienceList 
                  filters={filters}
                  selectedLocation={selectedLocation}
                  onExperienceSelect={(experience) => {
                    setSelectedExperience(experience);
                    setSelectedRoute(null);
                  }}
                />

                {selectedExperience && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-green-800">選択中の体験</h4>
                      <button
                        onClick={() => setSelectedExperience(null)}
                        className="text-green-600 hover:text-green-800 text-sm"
                      >
                        クリア
                      </button>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {selectedExperience.category} ({selectedExperience.rating}★)
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
