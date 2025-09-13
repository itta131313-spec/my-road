# Google Maps API セットアップガイド

## 概要

My Road アプリケーションでは以下のGoogle Maps機能を使用しています：
- 地図表示
- 場所選択（クリック）
- 住所・店舗名検索（Places API）
- ジオコーディング（座標→住所変換）

## 必要なAPIキーと設定

### 1. Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. 以下のAPIを有効化：
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**

### 2. APIキーの作成

1. Google Cloud Console > 認証情報 > 認証情報を作成 > APIキー
2. 作成されたAPIキーを制限（推奨）：
   - アプリケーションの制限: HTTPリファラー
   - 許可するリファラー例:
     ```
     localhost:3000/*
     yourdomain.com/*
     *.yourdomain.com/*
     ```
   - API制限: 上記3つのAPIのみを選択

### 3. 環境変数の設定

`.env.local` ファイルに以下を追加：

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key-here
```

**⚠️ 注意**: `NEXT_PUBLIC_` プレフィックスにより、このキーはクライアントサイドで使用されます。適切なHTTPリファラー制限を設定してください。

### 4. オプション: Map ID の設定（高度なスタイリング用）

カスタムマップスタイルを使用する場合：

1. Google Cloud Console > Maps JavaScript API > Map IDs
2. 新しいMap IDを作成
3. `.env.local` に追加：
```bash
NEXT_PUBLIC_GOOGLE_MAP_ID=your-map-id-here
```

## 実装された機能

### 地図表示
- 東京駅を中心とした初期表示
- ズーム・パン操作
- レスポンシブデザイン対応

### 場所選択
- 地図クリックによる座標取得
- 自動的な住所変換（Geocoding API使用）
- 選択場所のマーカー表示

### 住所・店舗名検索
- **リアルタイム検索**: Places API Text Search使用
- **検索範囲**: 東京駅から50km圏内
- **結果表示**: 最大5件のドロップダウン
- **情報表示**: 店舗名、住所、施設タイプ

### マーカー表示
- **体験マーカー**: 青色の評価表示
- **ルートマーカー**: 番号付きの順序表示
- **検索マーカー**: 緑色の検索アイコン
- **選択マーカー**: ハイライト表示

## トラブルシューティング

### 地図が表示されない場合

1. **APIキーの確認**
   ```bash
   # 環境変数が正しく設定されているか確認
   echo $NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   ```

2. **ブラウザのコンソールエラーを確認**
   - F12 > Console タブ
   - "Google Maps API" related エラーをチェック

3. **よくあるエラーと解決方法**：
   - `RefererNotAllowedMapError`: HTTPリファラー制限を確認
   - `ApiNotActivatedMapError`: 必要なAPIが有効化されているか確認
   - `InvalidKeyMapError`: APIキーが正しいか確認

### 検索機能が動作しない場合

1. **Places API の有効化を確認**
2. **APIキーにPlaces APIの権限があるか確認**
3. **ネットワーク接続を確認**

### パフォーマンスの最適化

1. **マーカーの制限**
   - 大量のマーカー表示時はクラスタリングを検討
   - 現在は50個程度まで推奨

2. **API使用量の監視**
   - Google Cloud Console > APIs & Services > 使用量
   - Places API Text Search: $17/1000リクエスト
   - Maps JavaScript API: $7/1000読み込み

## 本番環境への展開

### 1. 本番用APIキー設定
```bash
# Vercelの場合
vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# その他のホスティングサービス
# 各プラットフォームの環境変数設定方法に従う
```

### 2. HTTPリファラー制限の更新
本番ドメインを追加：
```
your-production-domain.com/*
*.your-production-domain.com/*
```

### 3. 使用量監視
- Google Cloud Console で使用量アラートを設定
- 予算上限の設定を推奨

## セキュリティ考慮事項

1. **APIキーの制限**: 必ずHTTPリファラー制限を設定
2. **使用量制限**: 不正使用を防ぐため日次制限を設定
3. **定期的な監視**: 使用量とエラーログを定期的にチェック

## サポートされているブラウザ

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

モバイルブラウザでも正常に動作します。