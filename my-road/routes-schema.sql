-- 工程ルート機能用のテーブル設計

-- routesテーブル（ルート全体の情報）
CREATE TABLE IF NOT EXISTS routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- "銭湯→居酒屋コース"のような名前
  description TEXT, -- ルートの説明
  total_duration INTEGER, -- 総所要時間（分）
  age_group TEXT NOT NULL,
  gender TEXT NOT NULL,
  overall_rating DECIMAL(2,1) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- route_stepsテーブル（ルート内の各ステップ）
CREATE TABLE IF NOT EXISTS route_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  experience_id UUID REFERENCES experiences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL, -- ステップの順番（1,2,3...）
  duration_minutes INTEGER, -- このステップの滞在時間
  travel_time_to_next INTEGER, -- 次のステップまでの移動時間
  notes TEXT, -- このステップに関するメモ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_routes_user_id ON routes (user_id);
CREATE INDEX IF NOT EXISTS idx_routes_created_at ON routes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routes_age_group ON routes (age_group);
CREATE INDEX IF NOT EXISTS idx_routes_gender ON routes (gender);

CREATE INDEX IF NOT EXISTS idx_route_steps_route_id ON route_steps (route_id);
CREATE INDEX IF NOT EXISTS idx_route_steps_order ON route_steps (route_id, step_order);
CREATE INDEX IF NOT EXISTS idx_route_steps_experience_id ON route_steps (experience_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_steps ENABLE ROW LEVEL SECURITY;

-- routesテーブルのポリシー
CREATE POLICY "Anyone can view routes" ON routes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert routes" ON routes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own routes" ON routes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes" ON routes
  FOR DELETE USING (auth.uid() = user_id);

-- route_stepsテーブルのポリシー
CREATE POLICY "Anyone can view route steps" ON route_steps
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert route steps" ON route_steps
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own route steps" ON route_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_steps.route_id 
      AND routes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own route steps" ON route_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_steps.route_id 
      AND routes.user_id = auth.uid()
    )
  );