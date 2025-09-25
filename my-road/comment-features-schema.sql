-- コメント機能のためのデータベーススキーマ

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