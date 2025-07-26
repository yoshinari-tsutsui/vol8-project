"use client";

import React, { useState } from 'react';
import Image from 'next/image';

interface PostFormData {
  content: string;
  imageFile: File | null;
  latitude: number | null;
  longitude: number | null;
  address: string;
}

interface PostFormProps {
  onSubmit: (data: PostFormData) => void;
  isSubmitting?: boolean;
}

export default function PostForm({ onSubmit, isSubmitting = false }: PostFormProps) {
  const [formData, setFormData] = useState<PostFormData>({
    content: '',
    imageFile: null,
    latitude: null,
    longitude: null,
    address: ''
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, imageFile: file });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          // 位置情報から住所を取得（後で実装）
          setFormData((prev: PostFormData) => ({ ...prev, address: '現在位置' }));
        },
        (error) => {
          console.error('位置情報の取得に失敗しました:', error);
          alert('位置情報の取得に失敗しました');
        }
      );
    } else {
      alert('このブラウザは位置情報をサポートしていません');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">新しい投稿</h2>
      
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        {/* テキスト入力 */}
        <div>
          <label htmlFor="content" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            投稿内容
          </label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, content: e.target.value })}
            placeholder="今どんな気分？"
            className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            rows={3}
          />
        </div>

        {/* 画像アップロード */}
        <div>
          <label htmlFor="image" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            画像をアップロード
          </label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full p-1 sm:p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
          />
          {formData.imageFile && (
            <div className="mt-2">
              <Image
                src={URL.createObjectURL(formData.imageFile)}
                alt="プレビュー"
                width={400}
                height={128}
                className="w-full h-24 sm:h-32 object-cover rounded-md"
              />
            </div>
          )}
        </div>

        {/* 位置情報 */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
            位置情報
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={getCurrentLocation}
              className="flex-1 px-3 sm:px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-xs sm:text-sm"
            >
              現在位置を取得
            </button>
          </div>
          {formData.latitude && formData.longitude && (
            <div className="mt-2 p-2 bg-gray-100 rounded-md text-xs sm:text-sm">
              <p>緯度: {formData.latitude.toFixed(6)}</p>
              <p>経度: {formData.longitude.toFixed(6)}</p>
            </div>
          )}
        </div>

        {/* 投稿ボタン */}
        <button
          type="submit"
          disabled={isSubmitting || !formData.content || !formData.latitude}
          className="w-full px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {isSubmitting ? '投稿中...' : '投稿する'}
        </button>
      </form>
    </div>
  );
} 