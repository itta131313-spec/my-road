-- 将来機能のためのデータベーススキーマ

-- 体験への写真投稿機能
CREATE TABLE IF NOT EXISTS experience_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_thumbnail_url TEXT,
  caption TEXT,
  file_size INTEGER,
  mime_type TEXT,
  is_primary BOOLEAN DEFAULT false, -- メイン写真として表示するかどうか
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_experience_photos_experience_id ON experience_photos (experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_photos_user_id ON experience_photos (user_id);
CREATE INDEX IF NOT EXISTS idx_experience_photos_created_at ON experience_photos (created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE experience_photos ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Anyone can view experience photos" ON experience_photos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert experience photos" ON experience_photos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own experience photos" ON experience_photos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experience photos" ON experience_photos
  FOR DELETE USING (auth.uid() = user_id);

-- 体験へのコメント機能
CREATE TABLE IF NOT EXISTS experience_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES experience_comments(id) ON DELETE CASCADE, -- 返信コメント用
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- オプショナルな追加評価
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_experience_comments_experience_id ON experience_comments (experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_comments_user_id ON experience_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_experience_comments_parent_id ON experience_comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_experience_comments_created_at ON experience_comments (created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE experience_comments ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Anyone can view experience comments" ON experience_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert experience comments" ON experience_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own experience comments" ON experience_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experience comments" ON experience_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ユーザープロフィール拡張
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  age_group TEXT,
  gender TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Anyone can view user profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- お気に入り機能
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, experience_id) -- 同じ体験を重複してお気に入りできないように
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_experience_id ON user_favorites (experience_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_favorites_unique ON user_favorites (user_id, experience_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- フォロー機能
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, followed_id), -- 同じユーザーを重複してフォローできないように
  CHECK(follower_id != followed_id) -- 自分自身はフォローできない
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed_id ON user_follows (followed_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_follows_unique ON user_follows (follower_id, followed_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Anyone can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own follows" ON user_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows" ON user_follows
  FOR DELETE USING (auth.uid() = follower_id);

-- 体験詳細情報の拡張（既存のexperiencesテーブルに追加）
-- 注意: これらはALTER TABLE文なので、既存データに影響する可能性があります
-- ALTER TABLE experiences ADD COLUMN IF NOT EXISTS description TEXT;
-- ALTER TABLE experiences ADD COLUMN IF NOT EXISTS budget_min INTEGER;
-- ALTER TABLE experiences ADD COLUMN IF NOT EXISTS budget_max INTEGER;
-- ALTER TABLE experiences ADD COLUMN IF NOT EXISTS companion_type TEXT; -- 'solo', 'couple', 'family', 'friends'など
-- ALTER TABLE experiences ADD COLUMN IF NOT EXISTS visit_duration INTEGER; -- 滞在時間（分）
-- ALTER TABLE experiences ADD COLUMN IF NOT EXISTS best_season TEXT; -- '春', '夏', '秋', '冬', '通年'
-- ALTER TABLE experiences ADD COLUMN IF NOT EXISTS accessibility_features TEXT[]; -- バリアフリー情報など

-- 通知機能
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'comment', 'follow', 'like', 'mention'など
  title TEXT NOT NULL,
  message TEXT,
  related_id UUID, -- 関連するエンティティのID（体験、コメントなど）
  related_type TEXT, -- 関連するエンティティのタイプ
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read) WHERE is_read = false;

-- RLS (Row Level Security) を有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);