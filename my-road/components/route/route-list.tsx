'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RouteWithSteps {
  id: string;
  title: string;
  description: string;
  total_duration: number;
  age_group: string;
  gender: string;
  overall_rating: number;
  created_at: string;
  steps: Array<{
    id: string;
    step_order: number;
    duration_minutes: number;
    travel_time_to_next: number;
    notes: string;
    experience: {
      id: string;
      category: string;
      rating: number;
      address: string;
      latitude: number;
      longitude: number;
    };
  }>;
}

interface RouteListProps {
  onRouteSelect?: (route: RouteWithSteps) => void;
  selectedLocation?: {
    lat: number;
    lng: number;
  } | null;
}

export default function RouteList({ onRouteSelect, selectedLocation }: RouteListProps) {
  const [routes, setRoutes] = useState<RouteWithSteps[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('routes')
        .select(`
          id,
          title,
          description,
          total_duration,
          age_group,
          gender,
          overall_rating,
          created_at,
          route_steps!inner (
            id,
            step_order,
            duration_minutes,
            travel_time_to_next,
            notes,
            experiences!inner (
              id,
              category,
              rating,
              address,
              latitude,
              longitude
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('ルートデータの取得エラー:', error);
      } else {
        // データを整理
        const processedRoutes: RouteWithSteps[] = [];
        const routeMap = new Map<string, RouteWithSteps>();

        data?.forEach((item: any) => {
          if (!routeMap.has(item.id)) {
            routeMap.set(item.id, {
              id: item.id,
              title: item.title,
              description: item.description,
              total_duration: item.total_duration,
              age_group: item.age_group,
              gender: item.gender,
              overall_rating: item.overall_rating,
              created_at: item.created_at,
              steps: []
            });
          }

          const route = routeMap.get(item.id)!;
          
          item.route_steps.forEach((step: any) => {
            route.steps.push({
              id: step.id,
              step_order: step.step_order,
              duration_minutes: step.duration_minutes,
              travel_time_to_next: step.travel_time_to_next,
              notes: step.notes,
              experience: step.experiences
            });
          });
        });

        // ステップをorder順にソート
        routeMap.forEach(route => {
          route.steps.sort((a, b) => a.step_order - b.step_order);
        });

        setRoutes(Array.from(routeMap.values()));
      }
    } catch (error) {
      console.error('ルートデータの取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}時間${mins > 0 ? mins + '分' : ''}` : `${mins}分`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">工程ルート ({routes.length}件)</h3>
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            まだ工程ルートが投稿されていません
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <Card 
              key={route.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onRouteSelect?.(route)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{route.title}</CardTitle>
                  <div className="text-sm text-gray-500">
                    {formatDate(route.created_at)}
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{route.age_group}</Badge>
                  <Badge variant="secondary">{route.gender}</Badge>
                  <Badge variant="outline">
                    {route.overall_rating.toFixed(1)}★
                  </Badge>
                  <Badge variant="outline">
                    {formatDuration(route.total_duration)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {route.description && (
                  <p className="text-sm text-gray-600 mb-3">
                    {route.description}
                  </p>
                )}

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">
                    ルート ({route.steps.length}ステップ):
                  </div>
                  <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
                    {route.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs whitespace-nowrap">
                          {step.experience.category}
                          <span className="ml-1">({step.experience.rating}★)</span>
                        </div>
                        {index < route.steps.length - 1 && (
                          <div className="text-gray-400">
                            →
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {route.steps.some(step => step.notes) && (
                  <div className="mt-3 space-y-1">
                    <div className="text-sm font-medium text-gray-700">メモ:</div>
                    {route.steps
                      .filter(step => step.notes)
                      .map(step => (
                        <div key={step.id} className="text-sm text-gray-600">
                          • {step.notes}
                        </div>
                      ))
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}