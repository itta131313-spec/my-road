-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Anyone can view experiences" ON experiences;
DROP POLICY IF EXISTS "Authenticated users can insert experiences" ON experiences;
DROP POLICY IF EXISTS "Users can update own experiences" ON experiences;
DROP POLICY IF EXISTS "Users can delete own experiences" ON experiences;

-- テーブルが存在する場合は削除
DROP TABLE IF EXISTS experiences;

-- 新しいテーブルを作成
CREATE TABLE experiences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  category TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  route_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX idx_experiences_latitude ON experiences (latitude);
CREATE INDEX idx_experiences_longitude ON experiences (longitude);
CREATE INDEX idx_experiences_category ON experiences (category);
CREATE INDEX idx_experiences_created_at ON experiences (created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Anyone can view experiences" ON experiences
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert experiences" ON experiences
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own experiences" ON experiences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences" ON experiences
  FOR DELETE USING (auth.uid() = user_id);