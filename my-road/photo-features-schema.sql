-- 写真投稿機能のためのデータベーススキーマ

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