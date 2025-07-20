"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { SpotifyTrackInfo } from '@/types';
import { playTrack, pausePlayback } from '@/lib/spotify';

interface MusicPlayerProps {
  track: SpotifyTrackInfo;
  compact?: boolean;
  showAlbumArt?: boolean;
}

export default function MusicPlayer({ 
  track, 
  compact = false, 
  showAlbumArt = true 
}: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(track.duration_ms / 1000);
  const [hasPreview, setHasPreview] = useState(!!track.preview_url);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // プレビュー音源の管理
  useEffect(() => {
    if (track.preview_url && audioRef.current) {
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      const handleError = () => {
        setHasPreview(false);
        console.warn('Preview audio failed to load');
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [track.preview_url]);

  // 楽曲再生の制御
  const handlePlayPause = async () => {
    setIsLoading(true);

    try {
      if (hasPreview && track.preview_url && audioRef.current) {
        // プレビュー音源を使用
        const audio = audioRef.current;
        
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
        } else {
          try {
            await audio.play();
            setIsPlaying(true);
          } catch (error) {
            console.error('Preview playback failed:', error);
            setHasPreview(false);
          }
        }
      } else {
        // Spotify Web Playback SDKを使用（実際のSpotify再生）
        if (isPlaying) {
          const success = await pausePlayback();
          if (success) {
            setIsPlaying(false);
          }
        } else {
          const success = await playTrack(track.uri);
          if (success) {
            setIsPlaying(true);
          } else {
            console.warn('Spotify playback failed. Make sure you have Spotify Premium and an active device.');
          }
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // アーティスト名を結合
  const getArtistNames = (artists: SpotifyTrackInfo['artists']) => {
    return artists.map(artist => artist.name).join(', ');
  };

  // アルバムアートのURL取得
  const getAlbumImageUrl = (images: SpotifyTrackInfo['album']['images'], size: 'small' | 'medium' | 'large' = 'small') => {
    if (!images || images.length === 0) return null;
    
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

  // 進行状況バー
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
        {/* プレビュー音源 */}
        {hasPreview && track.preview_url && (
          <audio
            ref={audioRef}
            src={track.preview_url}
            preload="metadata"
          />
        )}

        {/* アルバムアート（コンパクト版） */}
        {showAlbumArt && getAlbumImageUrl(track.album.images) && (
          <Image
            src={getAlbumImageUrl(track.album.images) || ''}
            alt={track.album.name}
            width={40}
            height={40}
            className="w-10 h-10 rounded object-cover"
          />
        )}

        {/* 楽曲情報 */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate text-sm">{track.name}</p>
          <p className="text-xs text-gray-600 truncate">{getArtistNames(track.artists)}</p>
        </div>

        {/* 再生ボタン */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 disabled:opacity-50 transition-colors"
          title={hasPreview ? "プレビュー再生" : "Spotifyで再生"}
        >
          {isLoading ? (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          ) : isPlaying ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Spotify外部リンク */}
        <a
          href={track.external_urls.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 hover:text-green-800 text-xs font-medium"
          title="Spotifyで開く"
        >
          🎵
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* プレビュー音源 */}
      {hasPreview && track.preview_url && (
        <audio
          ref={audioRef}
          src={track.preview_url}
          preload="metadata"
        />
      )}

      <div className="flex items-start space-x-4">
        {/* アルバムアート */}
        {showAlbumArt && getAlbumImageUrl(track.album.images) && (
          <Image
            src={getAlbumImageUrl(track.album.images, 'medium') || ''}
            alt={track.album.name}
            width={80}
            height={80}
            className="w-20 h-20 rounded-lg object-cover"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* 楽曲情報 */}
          <div className="mb-3">
            <h3 className="font-medium text-gray-900 truncate">{track.name}</h3>
            <p className="text-sm text-gray-600 truncate">{getArtistNames(track.artists)}</p>
            <p className="text-xs text-gray-500 truncate">{track.album.name}</p>
          </div>

          {/* コントロール */}
          <div className="flex items-center space-x-3">
            {/* 再生/一時停止ボタン */}
            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 disabled:opacity-50 transition-colors"
              title={hasPreview ? "プレビュー再生" : "Spotifyで再生"}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* 進行状況バー */}
            <div className="flex-1">
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <span>{formatTime(currentTime)}</span>
                <span className="mx-1">/</span>
                <span>{formatTime(duration)}</span>
                {hasPreview && (
                  <span className="ml-2 text-green-600">プレビュー</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full transition-all duration-100"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Spotify外部リンク */}
            <a
              href={track.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full hover:bg-green-600 transition-colors"
              title="Spotifyで開く"
            >
              Spotify
            </a>
          </div>

          {/* 機能説明 */}
          {!hasPreview && (
            <p className="text-xs text-gray-500 mt-2">
              💡 フル再生にはSpotify Premiumアカウントとアクティブなデバイスが必要です
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 