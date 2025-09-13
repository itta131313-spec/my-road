'use client';

import { useState, useEffect } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import GoogleMap from "@/components/map/google-map";
import SimpleMap from "@/components/map/simple-map";
import BasicMap from "@/components/map/basic-map";
import PlacesSearch from "@/components/map/places-search";
import ModernPlacesSearch from "@/components/map/modern-places-search";
import MapsDiagnostics from "@/components/map/maps-diagnostics";
import ExperienceForm from "@/components/experience/experience-form";
import ExperienceList from "@/components/experience/experience-list";
import ExperienceFilter from "@/components/filter/experience-filter";
import RouteForm from "@/components/route/route-form";
import RouteList from "@/components/route/route-list";
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
  const [searchLocation, setSearchLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
    name?: string;
  } | null>(null);

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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Map Section */}
        <div className="flex-1 p-2 sm:p-4">
          <div className="h-full min-h-[400px] lg:min-h-0">
            <h1 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">周辺の体験を探す</h1>
            <p className="text-sm sm:text-base text-gray-600 mb-2 sm:mb-4">地図をクリックして場所を指定するか、住所・店舗名で検索してください</p>
            
            {/* 場所検索 */}
            <div className="mb-4">
              <ModernPlacesSearch 
                onPlaceSelect={(place) => {
                  setSearchLocation(place);
                  setSelectedLocation({
                    lat: place.lat,
                    lng: place.lng,
                    address: place.address
                  });
                }}
              />
            </div>

            {/* 基本的なマップコンポーネント */}
            <BasicMap 
              searchLocation={searchLocation}
              experiences={experiences}
              onLocationSelect={setSelectedLocation}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50 overflow-y-auto max-h-screen lg:max-h-none">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('experience')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'experience'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                体験投稿
              </button>
              <button
                onClick={() => setActiveTab('route')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'route'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ルート作成
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'routes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ルート一覧
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
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
          <div className="p-2 sm:p-4">
            {activeTab === 'experience' && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">体験を投稿</h2>
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
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">工程ルート作成</h2>
                <RouteForm 
                  experiences={experiences}
                  searchLocation={searchLocation}
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
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-base sm:text-lg font-semibold">体験を検索・絞り込み</h2>
                
                <ExperienceFilter 
                  onFilterChange={setFilters}
                  selectedLocation={selectedLocation}
                  searchLocation={searchLocation}
                  availableCategories={experiences.map(exp => exp.category)}
                />

                <ExperienceList 
                  filters={filters}
                  selectedLocation={selectedLocation}
                  searchLocation={searchLocation}
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

                {/* 地図診断ツール */}
                <MapsDiagnostics />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
