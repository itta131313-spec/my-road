-- experiencesテーブルにGoogle Places API情報を保存するフィールドを追加

ALTER TABLE experiences
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS place_name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS google_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- インデックスを追加してパフォーマンスを向上
CREATE INDEX IF NOT EXISTS idx_experiences_place_id ON experiences(place_id);