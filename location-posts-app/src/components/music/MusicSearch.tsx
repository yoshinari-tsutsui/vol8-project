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
        const tracks: SpotifyTrackInfo[] = response.tracks.items.map((track: any) => {
          const trackInfo = {
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
          };
          
          console.log('🎵 検索結果楽曲:', {
            trackName: trackInfo.name,
            albumName: trackInfo.album.name,
            hasAlbumImages: !!trackInfo.album.images,
            albumImagesCount: trackInfo.album.images?.length || 0,
            firstImageUrl: trackInfo.album.images?.[0]?.url,
            hasPreview: !!trackInfo.preview_url
          });
          
          return trackInfo;
        });
        
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
    console.log('🔍 検索結果から楽曲選択:', {
      trackName: track.name,
      albumName: track.album.name,
      hasAlbumImages: !!track.album.images,
      albumImagesCount: track.album.images?.length || 0,
      firstImageUrl: track.album.images?.[0]?.url,
      hasPreview: !!track.preview_url,
      trackId: track.id
    });
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
              {getAlbumImageUrl(selectedTrack.album.images) ? (
                <div className="relative">
                  <Image
                    src={getAlbumImageUrl(selectedTrack.album.images) || ''}
                    alt={selectedTrack.album.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg object-cover shadow-md"
                  />
                  {/* プレビュー可能な場合のインジケーター */}
                  {selectedTrack.preview_url && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-green-800 truncate">{selectedTrack.name}</p>
                <p className="text-sm text-green-700 truncate">{getArtistNames(selectedTrack.artists)}</p>
                <p className="text-xs text-green-600 truncate">{selectedTrack.album.name}</p>
                {selectedTrack.preview_url && (
                  <div className="flex items-center mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs text-green-600">プレビュー再生可能</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={handleTrackDeselect}
                disabled={isDisabled}
                className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 p-1 rounded hover:bg-red-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {selectedTrack.external_urls?.spotify && (
                <a
                  href={selectedTrack.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 text-sm font-medium p-1 rounded hover:bg-green-50"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </a>
              )}
            </div>
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
                  className="w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {/* アルバムアート */}
                    {getAlbumImageUrl(track.album.images) ? (
                      <div className="relative flex-shrink-0">
                        <Image
                          src={getAlbumImageUrl(track.album.images) || ''}
                          alt={track.album.name}
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-lg object-cover shadow-sm"
                        />
                        {/* プレビュー可能な場合のインジケーター */}
                        {track.preview_url && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                    
                    {/* 楽曲情報 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-semibold text-gray-900 truncate">{track.name}</p>
                        {track.preview_url && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                            プレビュー
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{getArtistNames(track.artists)}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500 truncate">{track.album.name}</p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">{formatDuration(track.duration_ms)}</span>
                          {track.external_urls?.spotify && (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 選択アイコン */}
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
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