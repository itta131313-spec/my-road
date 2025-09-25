'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PhotoUploadForm from '@/components/photo/photo-upload-form';
import PhotoGallery from '@/components/photo/photo-gallery';
import CommentForm from '@/components/comment/comment-form';
import CommentList from '@/components/comment/comment-list';
import Link from 'next/link';

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
  place_id?: string;
  place_name?: string;
  website?: string;
  google_url?: string;
  phone?: string;
}

export default function ExperienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [refreshPhotos, setRefreshPhotos] = useState(0);
  const [refreshComments, setRefreshComments] = useState(0);

  const supabase = createClient();
  const experienceId = params.id as string;

  // 体験データを取得
  const fetchExperience = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('id', experienceId)
        .single();

      if (error) {
        console.error('体験データの取得エラー:', error);
        throw new Error(`体験データの取得に失敗しました: ${error.message}`);
      }

      if (!data) {
        throw new Error('体験データが見つかりませんでした');
      }

      setExperience(data);
    } catch (error) {
      console.error('体験データの取得エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '体験データの取得に失敗しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 現在のユーザー情報を取得
  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  useEffect(() => {
    fetchCurrentUser();
    if (experienceId) {
      fetchExperience();
    }
  }, [experienceId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long'
    });
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <nav className="w-full border-b border-b-foreground/10 h-16">
          <div className="w-full h-full flex justify-between items-center px-6">
            <Link href="/" className="text-xl font-semibold">My Road</Link>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full max-w-2xl mx-auto p-6">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !experience) {
    return (
      <main className="min-h-screen flex flex-col">
        <nav className="w-full border-b border-b-foreground/10 h-16">
          <div className="w-full h-full flex justify-between items-center px-6">
            <Link href="/" className="text-xl font-semibold">My Road</Link>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <div className="text-red-500 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-red-600 mb-2">
                体験データの読み込みエラー
              </h2>
              <p className="text-sm text-red-500 mb-6">
                {error || '体験データが見つかりませんでした'}
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => router.back()}
                  className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  戻る
                </button>
                <Link
                  href="/"
                  className="block w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-center"
                >
                  ホームへ
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <nav className="w-full border-b border-b-foreground/10 h-16 bg-white">
        <div className="w-full h-full flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-semibold">My Road</Link>
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              戻る
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">{experience.category}</CardTitle>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-5 h-5 ${
                            i < experience.rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-lg font-semibold text-gray-700">
                        {experience.rating}.0
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="mb-2">
                    {experience.age_group}・{experience.gender}
                  </Badge>
                  <div className="text-sm text-gray-500">
                    {formatDate(experience.created_at)}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">基本情報</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">時間帯:</span>
                      <Badge variant="secondary">{experience.time_of_day}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">カテゴリ:</span>
                      <Badge>{experience.category}</Badge>
                    </div>
                  </div>
                </div>

                {/* 場所情報 */}
                <div>
                  <h3 className="font-semibold mb-2">場所情報</h3>
                  <div className="space-y-2 text-sm">
                    {experience.place_name && (
                      <div>
                        <span className="text-gray-600">店舗名: </span>
                        <span className="font-medium">{experience.place_name}</span>
                      </div>
                    )}
                    {experience.address && (
                      <div>
                        <span className="text-gray-600">住所: </span>
                        <span>{experience.address}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">座標: </span>
                      <span>{experience.latitude.toFixed(6)}, {experience.longitude.toFixed(6)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <button
                  onClick={() => openGoogleMaps(experience.latitude, experience.longitude)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Google マップで見る
                </button>

                {experience.google_url && (
                  <a
                    href={experience.google_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Google で詳細を見る
                  </a>
                )}

                {experience.website && (
                  <a
                    href={experience.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    公式サイト
                  </a>
                )}

                {experience.phone && (
                  <a
                    href={`tel:${experience.phone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    電話する
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 写真ギャラリー */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>写真</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoGallery
                key={refreshPhotos}
                experienceId={experienceId}
                isOwner={currentUser?.id === experience.user_id}
                className=""
                showUploadForm={false}
              />
            </CardContent>
          </Card>

          {/* 写真投稿フォーム（体験の投稿者または認証済みユーザーのみ表示） */}
          {currentUser && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>写真を追加</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotoUploadForm
                  experienceId={experienceId}
                  onPhotoUploaded={() => {
                    // 写真ギャラリーを再読み込みする
                    setRefreshPhotos(prev => prev + 1);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* コメント投稿フォーム（認証済みユーザーのみ表示） */}
          {currentUser && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>コメントを投稿</CardTitle>
              </CardHeader>
              <CardContent>
                <CommentForm
                  experienceId={experienceId}
                  onCommentPosted={() => {
                    // コメント一覧を再読み込みする
                    setRefreshComments(prev => prev + 1);
                  }}
                  showRating={true}
                />
              </CardContent>
            </Card>
          )}

          {/* コメント一覧 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>コメント</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentList
                key={refreshComments}
                experienceId={experienceId}
              />
            </CardContent>
          </Card>

          {/* 地図表示エリア（将来的に追加予定） */}
          <Card>
            <CardHeader>
              <CardTitle>場所</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>地図表示（実装予定）</p>
                  <p className="text-xs mt-1">座標: {experience.latitude.toFixed(6)}, {experience.longitude.toFixed(6)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}