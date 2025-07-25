"use client";

import { useEffect, useState } from 'react';
import { checkSpotifyConfig, getSpotifyAuthUrl } from '@/lib/spotify';

export default function TestSpotify() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Spotify設定をチェック
    const configured = checkSpotifyConfig();
    setIsConfigured(configured);

    if (configured) {
      try {
        const url = getSpotifyAuthUrl();
        setAuthUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Spotify設定テスト</h1>
        
        <div className="space-y-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">設定状況</h3>
            <p className={`text-sm ${isConfigured ? 'text-green-600' : 'text-red-600'}`}>
              {isConfigured ? '✅ Spotify設定OK' : '❌ Spotify設定が不完全'}
            </p>
          </div>

          <div className="p-4 border rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">環境変数</h3>
            <div className="text-sm space-y-1">
              <p>Client ID: {process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ? '✅ 設定済み' : '❌ 未設定'}</p>
              <p>Redirect URI: {process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback'}</p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">エラー: {error}</p>
            </div>
          )}

          {authUrl && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-2">認証URL</h3>
              <p className="text-xs text-gray-600 break-all mb-3">{authUrl}</p>
              <a
                href={authUrl}
                className="inline-block px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                🎵 Spotifyでテスト認証
              </a>
            </div>
          )}

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">設定手順</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Spotify Developer Dashboardで以下をRedirect URIに追加:</li>
              <li className="ml-4 font-mono text-xs">http://localhost:3000/api/auth/spotify/callback</li>
              <li>.envファイルにクライアントIDとシークレットを設定</li>
              <li>開発サーバーを再起動</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
} 