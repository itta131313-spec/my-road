// 将来機能のための型定義

// 体験写真
export interface ExperiencePhoto {
  id: string;
  experience_id: string;
  user_id: string;
  photo_url: string;
  photo_thumbnail_url?: string;
  caption?: string;
  file_size?: number;
  mime_type?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// 体験コメント
export interface ExperienceComment {
  id: string;
  experience_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  rating?: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // リレーション
  user_profile?: UserProfile;
  replies?: ExperienceComment[];
}

// ユーザープロフィール
export interface UserProfile {
  id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  age_group?: string;
  gender?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

// お気に入り
export interface UserFavorite {
  id: string;
  user_id: string;
  experience_id: string;
  created_at: string;
}

// フォロー
export interface UserFollow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
}

// 通知
export interface Notification {
  id: string;
  user_id: string;
  type: 'comment' | 'follow' | 'like' | 'mention' | 'route_like';
  title: string;
  message?: string;
  related_id?: string;
  related_type?: 'experience' | 'comment' | 'route' | 'user';
  is_read: boolean;
  created_at: string;
}

// 拡張された体験情報
export interface ExtendedExperience {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  category: string;
  rating: number;
  age_group: string;
  gender: string;
  time_of_day: string;
  route_ids?: string[];
  created_at: string;
  updated_at: string;
  // 将来追加予定の拡張フィールド
  description?: string;
  budget_min?: number;
  budget_max?: number;
  companion_type?: 'solo' | 'couple' | 'family' | 'friends' | 'group';
  visit_duration?: number; // 分
  best_season?: '春' | '夏' | '秋' | '冬' | '通年';
  accessibility_features?: string[];
  // リレーション
  photos?: ExperiencePhoto[];
  comments?: ExperienceComment[];
  user_profile?: UserProfile;
  is_favorited?: boolean;
  favorites_count?: number;
  comments_count?: number;
}

// 写真アップロード用の型
export interface PhotoUploadData {
  file: File;
  caption?: string;
  is_primary?: boolean;
}

// コメント投稿用の型
export interface CommentPostData {
  content: string;
  rating?: number;
  parent_comment_id?: string;
}

// ユーザープロフィール更新用の型
export interface UserProfileUpdateData {
  display_name?: string;
  bio?: string;
  age_group?: string;
  gender?: string;
  location?: string;
  avatar_file?: File;
}

// 体験詳細更新用の型
export interface ExperienceUpdateData {
  description?: string;
  budget_min?: number;
  budget_max?: number;
  companion_type?: 'solo' | 'couple' | 'family' | 'friends' | 'group';
  visit_duration?: number;
  best_season?: '春' | '夏' | '秋' | '冬' | '通年';
  accessibility_features?: string[];
}

// API レスポンス用の型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

// フィルタリング用の型
export interface ExtendedFilterOptions {
  categories?: string[];
  ageGroups?: string[];
  genders?: string[];
  timeOfDay?: string[];
  minRating?: number;
  maxDistance?: number;
  budgetRange?: {
    min?: number;
    max?: number;
  };
  companionTypes?: string[];
  seasons?: string[];
  hasPhotos?: boolean;
  sortBy?: 'rating' | 'distance' | 'created_at' | 'age_group' | 'gender' | 'favorites_count' | 'comments_count';
  sortOrder?: 'asc' | 'desc';
}