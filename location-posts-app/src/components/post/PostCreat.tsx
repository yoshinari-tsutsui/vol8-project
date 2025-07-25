"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Image from 'next/image';
import MusicSearch from '@/components/music/MusicSearch';
import { 
  isSpotifyAuthenticated, 
  initializeSpotifyApi, 
  checkSpotifyConfig,
  SpotifyTrackInfo,
  setSpotifyAccessToken,
  clearSpotifyAuth
} from '@/lib/spotify';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface PostData {
  content: string;
  imageFile: File | null;
  imageUrl?: string;
  musicUrl?: string;
  musicInfo?: SpotifyTrackInfo;
  location: Location | null;
}

interface PostCreatorProps {
  onPostCreate: (postData: PostData) => void;
  isCreating?: boolean;
  onCancel?: () => void;
  selectedLocation?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
}

export default function PostCreator({
  onPostCreate,
  isCreating = false,
  onCancel,
  selectedLocation
}: PostCreatorProps) {
  // フォーム状態
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<SpotifyTrackInfo | null>(null);
  const [location, setLocation] = useState<Location | null>(
    selectedLocation ? {
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      address: selectedLocation.address || `緯度: ${selectedLocation.lat.toFixed(4)}, 経度: ${selectedLocation.lng.toFixed(4)}`
    } : null
  );
  
  // UI状態
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [imageMode, setImageMode] = useState<'file' | 'camera'>('file');
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Spotify状態
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [isConnectingSpotify, setIsConnectingSpotify] = useState(false);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [spotifyConfigured, setSpotifyConfigured] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '' });

  // Spotify初期化
  useEffect(() => {
    const initSpotify = () => {
      setSpotifyConfigured(checkSpotifyConfig());
      if (checkSpotifyConfig()) {
        initializeSpotifyApi();
        setIsSpotifyConnected(isSpotifyAuthenticated());
      }
    };

    initSpotify();
    
    // トークンが変更された場合のリスナー
    const checkAuthStatus = () => {
      setIsSpotifyConnected(isSpotifyAuthenticated());
    };

    // 定期的に認証状態をチェック
    const interval = setInterval(checkAuthStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // URLパラメータからトークンを取得
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const spotifyToken = urlParams.get('spotify_token');
      const error = urlParams.get('error');

      if (spotifyToken) {
        // トークンを設定
        setSpotifyAccessToken(spotifyToken);
        setIsSpotifyConnected(true);
        
        // URLからパラメータを削除
        const url = new URL(window.location.href);
        url.searchParams.delete('spotify_token');
        url.searchParams.delete('success');
        window.history.replaceState({}, '', url.toString());
      } else if (error) {
        console.error('Spotify auth error:', error);
        
        // URLからエラーパラメータを削除
        const url = new URL(window.location.href);
        url.searchParams.delete('error');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!content.trim()) {
      newErrors.content = '投稿内容を入力してください';
    }
    
    if (!location) {
      newErrors.location = '位置情報を設定してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 画像処理
  const handleImageSelect = useCallback((file: File) => {
    // ファイル検証
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev: {[key: string]: string}) => ({ ...prev, image: 'サポートされていない画像形式です' }));
      return;
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors((prev: {[key: string]: string}) => ({ ...prev, image: 'ファイルサイズが5MBを超えています' }));
      return;
    }

    setErrors((prev: {[key: string]: string}) => ({ ...prev, image: '' }));
    setSelectedImage(file);
    
    // プレビュー作成
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageRemove = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // カメラストリームを停止
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // カメラ機能
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // 背面カメラを優先
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      setErrors((prev: {[key: string]: string}) => ({ 
        ...prev, 
        image: 'カメラへのアクセスに失敗しました。ブラウザの設定を確認してください。' 
      }));
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d')!;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Canvas内容をBlobに変換してFileオブジェクト作成
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          handleImageSelect(file);
        }
      }, 'image/jpeg', 0.8);
      
      // カメラを停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // ドラッグ&ドロップ
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  // 位置情報処理
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev: {[key: string]: string}) => ({ ...prev, location: 'お使いのブラウザは位置情報機能をサポートしていません' }));
      return;
    }

    setIsGettingLocation(true);
    setErrors((prev: {[key: string]: string}) => ({ ...prev, location: '' }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: `緯度: ${position.coords.latitude.toFixed(4)}, 経度: ${position.coords.longitude.toFixed(4)}`
        };
        setLocation(newLocation);
        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        let errorMessage = '位置情報の取得に失敗しました';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の取得が拒否されました';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報が取得できません';
            break;
          case error.TIMEOUT:
            errorMessage = '位置情報の取得がタイムアウトしました';
            break;
        }
        setErrors((prev: {[key: string]: string}) => ({ ...prev, location: errorMessage }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLocation.latitude);
    const lng = parseFloat(manualLocation.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setErrors((prev: {[key: string]: string}) => ({ ...prev, location: '有効な緯度・経度を入力してください' }));
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setErrors((prev: {[key: string]: string}) => ({ ...prev, location: '緯度は-90〜90、経度は-180〜180の範囲で入力してください' }));
      return;
    }

    const newLocation: Location = {
      latitude: lat,
      longitude: lng,
      address: `緯度: ${lat.toFixed(4)}, 経度: ${lng.toFixed(4)}`
    };
    
    setLocation(newLocation);
    setManualLocation({ latitude: '', longitude: '' });
    setErrors((prev: {[key: string]: string}) => ({ ...prev, location: '' }));
  };

  // Spotify関連ハンドラー
  const handleSpotifyLogin = () => {
    if (!spotifyConfigured) {
      setErrors((prev: {[key: string]: string}) => ({ 
        ...prev, 
        spotify: 'Spotify設定が不完全です。環境変数を確認してください。' 
      }));
      return;
    }

    setShowAuthModal(true);
    
    // 現在のページURLをstateパラメータとして送信
    const currentUrl = window.location.href;
    const state = encodeURIComponent(JSON.stringify({ returnUrl: currentUrl }));
    
    // Spotify認証ページを同ウィンドウで開く
    const authUrl = `/api/auth/spotify/login?state=${state}`;
    window.location.href = authUrl;
  };

  const handleSpotifyLogout = () => {
    clearSpotifyAuth();
    setIsSpotifyConnected(false);
    setSelectedMusic(null);
  };

  const handleMusicSelect = (track: SpotifyTrackInfo) => {
    setSelectedMusic(track);
    setShowMusicSearch(false);
    setErrors((prev: {[key: string]: string}) => ({ ...prev, spotify: '' }));
  };

  const handleMusicRemove = () => {
    setSelectedMusic(null);
  };

  const toggleMusicSearch = () => {
    setShowMusicSearch(!showMusicSearch);
  };

  // 選択された音楽の表示
  useEffect(() => {
    if (selectedMusic) {
      console.log('🎵 選択された音楽の詳細:', {
        trackName: selectedMusic.name,
        albumName: selectedMusic.album.name,
        hasAlbumImages: !!selectedMusic.album.images,
        albumImagesCount: selectedMusic.album.images?.length || 0,
        firstImageUrl: selectedMusic.album.images?.[0]?.url,
        imageWidth: selectedMusic.album.images?.[0]?.width,
        imageHeight: selectedMusic.album.images?.[0]?.height,
        hasPreview: !!selectedMusic.preview_url
      });
    }
  }, [selectedMusic]);

  // フォーム送信
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const postData: PostData = {
      content: content.trim(),
      imageFile: selectedImage,
      musicUrl: selectedMusic?.external_urls?.spotify,
      musicInfo: selectedMusic || undefined,
      location
    };

    onPostCreate(postData);
  };

  // リセット
  const handleReset = () => {
    setContent('');
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedMusic(null);
    setShowMusicSearch(false);
    setLocation(null);
    setManualLocation({ latitude: '', longitude: '' });
    setErrors({});
    setImageMode('file');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // カメラストリームを停止
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">新しい投稿を作成</h2>
      
      {selectedLocation && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            📍 選択した位置: {selectedLocation.address || `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 投稿内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            投稿内容 *
          </label>
          <textarea
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            placeholder="今何をしていますか？"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isCreating}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
        </div>

        {/* 画像アップロード */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            画像 (オプション)
          </label>
          
          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              📸 画像アップロード・カメラ撮影機能が利用可能です！ファイルサイズは5MB以下にしてください。
            </p>
          </div>

          {/* モード選択ボタン */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setImageMode('file');
                stopCamera();
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                imageMode === 'file' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isCreating}
            >
              📁 ファイル選択
            </button>
            <button
              type="button"
              onClick={() => {
                setImageMode('camera');
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                imageMode === 'camera' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              disabled={isCreating}
            >
              📷 カメラ撮影
            </button>
          </div>
          
          {imagePreview ? (
            <div className="relative inline-block">
              <Image 
                src={imagePreview} 
                alt="プレビュー" 
                width={400}
                height={256}
                className="max-w-full max-h-64 rounded-lg shadow-md object-cover"
              />
              <button
                type="button"
                onClick={handleImageRemove}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                disabled={isCreating}
              >
                ×
              </button>
            </div>
          ) : (
            <div>
              {imageMode === 'file' ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    ${isCreating ? 'pointer-events-none opacity-50' : ''}
                  `}
                >
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-700">画像をアップロード</p>
                  <p className="text-sm text-gray-500 mt-1">ドラッグ&ドロップまたはクリック</p>
                  <p className="text-xs text-gray-400 mt-2">JPEG, PNG, WebP, GIF (最大5MB)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* カメラビュー */}
                  <div className="relative">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline
                      className="w-full h-64 object-cover rounded-lg bg-gray-200"
                      style={{ display: stream ? 'block' : 'none' }}
                    />
                    {!stream && (
                      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <div className="text-4xl mb-2">📷</div>
                          <p>カメラを開始してください</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* カメラ操作ボタン */}
                  <div className="flex gap-2">
                    {!stream ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 font-medium disabled:opacity-50"
                        disabled={isCreating}
                      >
                        📷 カメラ開始
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 font-medium disabled:opacity-50"
                          disabled={isCreating}
                        >
                          📸 撮影
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="flex-1 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 font-medium disabled:opacity-50"
                          disabled={isCreating}
                        >
                          🛑 停止
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
            className="hidden"
            disabled={isCreating}
          />
          
          {errors.image && (
            <p className="mt-1 text-sm text-red-600">{errors.image}</p>
          )}
        </div>

        {/* 音楽 (Spotify) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            音楽 (オプション)
          </label>
          
          {!spotifyConfigured ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                🎵 Spotify機能を利用するには環境変数の設定が必要です
              </p>
            </div>
          ) : !isSpotifyConnected ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  🎵 投稿に音楽を追加するには、Spotifyにログインしてください
                </p>
              </div>
              <button
                type="button"
                onClick={handleSpotifyLogin}
                disabled={isConnectingSpotify || isCreating}
                className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
              >
                {isConnectingSpotify ? 'Spotifyに接続中...' : '🎵 Spotifyにログイン'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 選択された音楽の表示 */}
              {selectedMusic ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedMusic.album.images?.[0] ? (
                        <div className="relative">
                          <Image
                            src={selectedMusic.album.images[0].url}
                            alt={selectedMusic.album.name}
                            width={64}
                            height={64}
                            className="w-16 h-16 rounded-lg object-cover shadow-md"
                            onError={(e) => {
                              console.error('🎵 画像読み込みエラー:', {
                                imageUrl: selectedMusic.album.images[0].url,
                                error: e
                              });
                              // エラー時にフォールバックアイコンを表示
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                          />
                          {/* フォールバックアイコン */}
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center hidden">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-green-800 truncate">{selectedMusic.name}</p>
                        <p className="text-sm text-green-700 truncate">
                          {selectedMusic.artists.map(artist => artist.name).join(', ')}
                        </p>
                        <p className="text-xs text-green-600 truncate">{selectedMusic.album.name}</p>
                        {selectedMusic.preview_url && (
                          <div className="flex items-center mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            <span className="text-xs text-green-600">プレビュー再生可能</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <button
                        type="button"
                        onClick={handleMusicRemove}
                        disabled={isCreating}
                        className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 p-1 rounded hover:bg-red-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      {selectedMusic.external_urls?.spotify && (
                        <a
                          href={selectedMusic.external_urls.spotify}
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
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Spotify接続済み！楽曲を検索して投稿に追加できます
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={toggleMusicSearch}
                      disabled={isCreating}
                      className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                      </svg>
                      <span>{showMusicSearch ? '🎵 検索を閉じる' : '🎵 楽曲を検索'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSpotifyLogout}
                      disabled={isCreating}
                      className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-medium"
                    >
                      🚪 ログアウト
                    </button>
                  </div>
                </div>
              )}

              {/* 音楽検索 */}
              {showMusicSearch && !selectedMusic && (
                <div className="border border-gray-300 rounded-lg p-4">
                  <MusicSearch 
                    onTrackSelect={handleMusicSelect}
                    isDisabled={isCreating}
                  />
                </div>
              )}
            </div>
          )}
          
          {errors.spotify && (
            <p className="mt-1 text-sm text-red-600">{errors.spotify}</p>
          )}
        </div>

        {/* 位置情報 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            位置情報 *
          </label>
          
          {location ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-green-800">選択済みの位置</p>
                  <p className="text-sm text-green-700">{location.address}</p>
                  <p className="text-xs text-green-600">
                    座標: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation(null)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  disabled={isCreating}
                >
                  削除
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation || isCreating}
                className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {isGettingLocation ? '位置情報を取得中...' : '現在位置を取得'}
              </button>
              
              <div className="flex items-center">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="px-3 text-gray-500 text-sm">または</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  placeholder="緯度"
                  value={manualLocation.latitude}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualLocation((prev: { latitude: string; longitude: string }) => ({ ...prev, latitude: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                />
                <input
                  type="number"
                  step="any"
                  placeholder="経度"
                  value={manualLocation.longitude}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualLocation((prev: { latitude: string; longitude: string }) => ({ ...prev, longitude: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  disabled={isCreating}
                />
              </div>
              
              <button
                type="button"
                onClick={handleManualLocation}
                disabled={!manualLocation.latitude || !manualLocation.longitude || isCreating}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                座標を設定
              </button>
            </div>
          )}
          
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location}</p>
          )}
        </div>

        {/* ボタン */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isCreating}
            className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {isCreating ? '投稿中...' : '投稿する'}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={isCreating}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50"
          >
            リセット
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isCreating}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 disabled:opacity-50"
            >
              キャンセル
            </button>
          )}
        </div>
      </form>
      
      {/* 隠しcanvas要素（カメラ撮影用） */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
} 