-- 匿名ユーザーでも投稿可能にするためのポリシー更新

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Authenticated users can insert experiences" ON experiences;
DROP POLICY IF EXISTS "Authenticated users can insert routes" ON routes;
DROP POLICY IF EXISTS "Authenticated users can insert route steps" ON route_steps;
DROP POLICY IF EXISTS "Users can read own experiences" ON experiences;
DROP POLICY IF EXISTS "Users can read own routes" ON routes;
DROP POLICY IF EXISTS "Users can read own route steps" ON route_steps;
DROP POLICY IF EXISTS "Anyone can read experiences" ON experiences;
DROP POLICY IF EXISTS "Anyone can read routes" ON routes;
DROP POLICY IF EXISTS "Anyone can read route steps" ON route_steps;

-- 匿名ユーザーでも投稿可能な新しいポリシーを作成
CREATE POLICY "Anyone can insert experiences" ON experiences
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert routes" ON routes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert route steps" ON route_steps
  FOR INSERT WITH CHECK (true);

-- 全員がデータを読み取り可能なポリシーを作成
CREATE POLICY "Anyone can read experiences" ON experiences
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read routes" ON routes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read route steps" ON route_steps
  FOR SELECT USING (true);

-- user_idカラムをNULL許可に変更（匿名投稿用）
ALTER TABLE experiences ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE routes ALTER COLUMN user_id DROP NOT NULL;

-- 既存のUPDATE/DELETEポリシーを匿名投稿対応に修正
DROP POLICY IF EXISTS "Users can update own experiences" ON experiences;
DROP POLICY IF EXISTS "Users can delete own experiences" ON experiences;
DROP POLICY IF EXISTS "Users can update own routes" ON routes;
DROP POLICY IF EXISTS "Users can delete own routes" ON routes;
DROP POLICY IF EXISTS "Users can update own route steps" ON route_steps;
DROP POLICY IF EXISTS "Users can delete own route steps" ON route_steps;

-- 匿名投稿は編集・削除不可、認証ユーザーは自分の投稿のみ編集・削除可能
CREATE POLICY "Users can update own experiences" ON experiences
  FOR UPDATE USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can delete own experiences" ON experiences
  FOR DELETE USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can update own routes" ON routes
  FOR UPDATE USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can delete own routes" ON routes
  FOR DELETE USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can update own route steps" ON route_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_steps.route_id 
      AND routes.user_id = auth.uid()
      AND routes.user_id IS NOT NULL
    )
  );

CREATE POLICY "Users can delete own route steps" ON route_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routes 
      WHERE routes.id = route_steps.route_id 
      AND routes.user_id = auth.uid()
      AND routes.user_id IS NOT NULL
    )
  );