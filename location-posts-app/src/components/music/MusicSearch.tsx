"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { searchTracks, SpotifyTrackInfo } from '@/lib/spotify';

interface MusicSearchProps {
  onTrackSelect: (track: SpotifyTrackInfo) => void;
  isDisabled?: boolean;
}

interface SpotifySearchResponse {
  tracks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[];
  };
}

export default function MusicSearch({ onTrackSelect, isDisabled = false }: MusicSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrackInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrackInfo | null>(null);

  // 検索の実行（デバウンス付き）
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchTracks(query, 10) as SpotifySearchResponse | null;
      if (response && response.tracks && response.tracks.items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tracks: SpotifyTrackInfo[] = response.tracks.items.map((track: any) => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map((artist: { id: string; name: string }) => ({
            id: artist.id,
            name: artist.name
          })),
          album: {
            id: track.album.id,
            name: track.album.name,
            images: track.album.images
          },
          duration_ms: track.duration_ms,
          external_urls: track.external_urls,
          preview_url: track.preview_url,
          uri: track.uri
        }));
        
        setSearchResults(tracks);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // デバウンス検索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // 楽曲選択ハンドラー
  const handleTrackSelect = (track: SpotifyTrackInfo) => {
    setSelectedTrack(track);
    setShowResults(false);
    setSearchQuery('');
    onTrackSelect(track);
  };

  // 選択解除ハンドラー
  const handleTrackDeselect = () => {
    setSelectedTrack(null);
  };

  // 楽曲の時間をフォーマット
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // アーティスト名を結合
  const getArtistNames = (artists: SpotifyTrackInfo['artists']) => {
    return artists.map(artist => artist.name).join(', ');
  };

  // アルバムアートのURL取得
  const getAlbumImageUrl = (images: SpotifyTrackInfo['album']['images'], size: 'small' | 'medium' | 'large' = 'small') => {
    if (!images || images.length === 0) return null;
    
    // サイズに応じて最適な画像を選択
    const sortedImages = images.sort((a, b) => b.width - a.width);
    switch (size) {
      case 'large':
        return sortedImages[0]?.url;
      case 'medium':
        return sortedImages[Math.floor(sortedImages.length / 2)]?.url || sortedImages[0]?.url;
      case 'small':
      default:
        return sortedImages[sortedImages.length - 1]?.url || sortedImages[0]?.url;
    }
  };

  return (
    <div className="space-y-4">
      {/* 選択された楽曲の表示 */}
      {selectedTrack && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getAlbumImageUrl(selectedTrack.album.images) && (
                <Image
                  src={getAlbumImageUrl(selectedTrack.album.images) || ''}
                  alt={selectedTrack.album.name}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <div>
                <p className="font-medium text-green-800">{selectedTrack.name}</p>
                <p className="text-sm text-green-700">{getArtistNames(selectedTrack.artists)}</p>
                <p className="text-xs text-green-600">{selectedTrack.album.name}</p>
              </div>
            </div>
            <button
              onClick={handleTrackDeselect}
              disabled={isDisabled}
              className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
            >
              削除
            </button>
          </div>
        </div>
      )}

      {/* 検索フィールド */}
      {!selectedTrack && (
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="楽曲名、アーティスト名で検索..."
              disabled={isDisabled}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 disabled:opacity-50"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* 検索結果 */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
              {searchResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleTrackSelect(track)}
                  disabled={isDisabled}
                  className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    {getAlbumImageUrl(track.album.images) && (
                      <Image
                        src={getAlbumImageUrl(track.album.images) || ''}
                        alt={track.album.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{track.name}</p>
                      <p className="text-sm text-gray-600 truncate">{getArtistNames(track.artists)}</p>
                      <p className="text-xs text-gray-500 truncate">{track.album.name} • {formatDuration(track.duration_ms)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 検索結果なしメッセージ */}
          {showResults && searchResults.length === 0 && !isSearching && searchQuery.length >= 2 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
              <p className="text-gray-500 text-center">検索結果が見つかりませんでした</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 