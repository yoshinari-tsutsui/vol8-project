"use client";

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface PostData {
  content: string;
  imageFile: File | null;
  imageUrl?: string;
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
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [manualLocation, setManualLocation] = useState({ latitude: '', longitude: '' });

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

  // フォーム送信
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const postData: PostData = {
      content: content.trim(),
      imageFile: selectedImage,
      location
    };

    onPostCreate(postData);
  };

  // リセット
  const handleReset = () => {
    setContent('');
    setSelectedImage(null);
    setImagePreview(null);
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