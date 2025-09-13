'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DiagnosticsResult {
  apiKey: boolean;
  apiKeyValue?: string;
  googleMapsLoaded: boolean;
  placesLibrary: boolean;
  geocodingLibrary: boolean;
  networkConnection: boolean;
  errors: string[];
}

export default function MapsDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const result: DiagnosticsResult = {
      apiKey: false,
      googleMapsLoaded: false,
      placesLibrary: false,
      geocodingLibrary: false,
      networkConnection: false,
      errors: []
    };

    try {
      // APIキーの確認
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      result.apiKey = !!apiKey;
      result.apiKeyValue = apiKey ? `${apiKey.substring(0, 8)}...` : undefined;

      // ネットワーク接続の確認
      try {
        await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' });
        result.networkConnection = true;
      } catch {
        result.networkConnection = false;
        result.errors.push('ネットワーク接続に問題があります');
      }

      // Google Maps の読み込み確認
      if (typeof window !== 'undefined') {
        result.googleMapsLoaded = !!(window as any).google?.maps;
        
        if (result.googleMapsLoaded) {
          result.placesLibrary = !!(window as any).google?.maps?.places;
          result.geocodingLibrary = !!(window as any).google?.maps?.Geocoder;
        }
      }

      // APIキーの有効性をテスト
      if (result.apiKey && result.networkConnection) {
        try {
          const testUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          const response = await fetch(testUrl, { mode: 'no-cors' });
          // no-corsモードなので実際のレスポンスは確認できないが、エラーが発生しなければOK
        } catch (error) {
          result.errors.push('APIキーの検証中にエラーが発生しました');
        }
      }

    } catch (error) {
      result.errors.push(`診断中にエラーが発生しました: ${error}`);
    }

    setDiagnostics(result);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? '✅' : '❌';
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Google Maps 診断</CardTitle>
      </CardHeader>
      <CardContent>
        {isRunning ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm">診断実行中...</span>
          </div>
        ) : diagnostics ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className={`flex justify-between ${getStatusColor(diagnostics.apiKey)}`}>
                <span>APIキー設定</span>
                <span>{getStatusIcon(diagnostics.apiKey)} {diagnostics.apiKeyValue || 'なし'}</span>
              </div>
              
              <div className={`flex justify-between ${getStatusColor(diagnostics.networkConnection)}`}>
                <span>ネットワーク接続</span>
                <span>{getStatusIcon(diagnostics.networkConnection)}</span>
              </div>
              
              <div className={`flex justify-between ${getStatusColor(diagnostics.googleMapsLoaded)}`}>
                <span>Google Maps 読み込み</span>
                <span>{getStatusIcon(diagnostics.googleMapsLoaded)}</span>
              </div>
              
              <div className={`flex justify-between ${getStatusColor(diagnostics.placesLibrary)}`}>
                <span>Places ライブラリ</span>
                <span>{getStatusIcon(diagnostics.placesLibrary)}</span>
              </div>
              
              <div className={`flex justify-between ${getStatusColor(diagnostics.geocodingLibrary)}`}>
                <span>Geocoding ライブラリ</span>
                <span>{getStatusIcon(diagnostics.geocodingLibrary)}</span>
              </div>
            </div>

            {diagnostics.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="font-medium text-red-800 mb-2">エラー:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {diagnostics.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {!diagnostics.googleMapsLoaded && diagnostics.networkConnection && diagnostics.apiKey && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-medium text-yellow-800 mb-2">推奨アクション:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Google Cloud Console で以下のAPIを有効化:</li>
                  <li>&nbsp;&nbsp;- Maps JavaScript API</li>
                  <li>&nbsp;&nbsp;- Places API</li>
                  <li>&nbsp;&nbsp;- Geocoding API</li>
                  <li>• APIキーの制限設定を確認</li>
                  <li>• ページを再読み込み</li>
                </ul>
              </div>
            )}

            <button
              onClick={runDiagnostics}
              className="mt-3 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              再診断
            </button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}