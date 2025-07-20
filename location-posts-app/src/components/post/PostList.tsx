"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { Post } from '@/types';
import MusicPlayer from '@/components/music/MusicPlayer';

interface PostListProps {
  posts: Post[];
  isLoading?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
}

export default function PostList({
  posts,
  isLoading = false,
  onRefresh,
  emptyMessage = "まだ投稿がありません"
}: PostListProps) {
  const [imageErrors, setImageErrors] = useState<{[key: string]: boolean}>({});

  const handleImageError = (postId: string) => {
    setImageErrors((prev: {[key: string]: boolean}) => ({ ...prev, [postId]: true }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // 1分未満
    if (diff < 60000) {
      return 'たった今';
    }
    
    // 1時間未満
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}分前`;
    }
    
    // 24時間未満
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}時間前`;
    }
    
    // 7日未満
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days}日前`;
    }
    
    // それ以上は日付表示
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLocation = (location: Post['location']) => {
    if (location.address) {
      return location.address;
    }
    return `緯度: ${location.latitude.toFixed(4)}, 経度: ${location.longitude.toFixed(4)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">投稿一覧</h2>
        </div>
        
        {/* ローディング表示 */}
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">
          投稿一覧 ({posts.length}件)
        </h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            🔄 更新
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-lg text-gray-600 mb-2">{emptyMessage}</p>
          <p className="text-gray-500">最初の投稿を作成してみましょう！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* ヘッダー部分 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {post.author?.avatarUrl ? (
                      <Image
                        src={post.author.avatarUrl}
                        alt={post.author.displayName || post.author.username}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                        {post.author?.displayName?.[0] || post.author?.username?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">
                        {post.author?.displayName || post.author?.username || '匿名ユーザー'}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
                    </div>
                  </div>
                  
                  {/* 位置情報 */}
                  <div className="text-right">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {formatLocation(post.location)}
                    </div>
                  </div>
                </div>

                {/* 投稿内容 */}
                <div className="mb-4">
                  <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                {/* 音楽プレイヤー */}
                {post.track && (
                  <div className="mb-4">
                    <MusicPlayer 
                      track={post.track} 
                      compact={true}
                      showAlbumArt={true}
                    />
                  </div>
                )}

                {/* 画像表示 */}
                {post.imageUrl && !imageErrors[post.id] && (
                  <div className="mb-4">
                    <Image
                      src={post.imageUrl}
                      alt="投稿画像"
                      width={448}
                      height={300}
                      className="w-full max-w-md rounded-lg shadow-sm object-cover"
                      onError={() => handleImageError(post.id)}
                      loading="lazy"
                    />
                  </div>
                )}

                {/* フッター部分 */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-gray-500">
                    {/* いいねボタン（将来の機能） */}
                    <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span className="text-sm">いいね</span>
                    </button>
                    
                    {/* コメントボタン（将来の機能） */}
                    <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm">コメント</span>
                    </button>
                    
                    {/* シェアボタン（将来の機能） */}
                    <button className="flex items-center space-x-1 hover:text-green-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span className="text-sm">シェア</span>
                    </button>

                    {/* 音楽があることを示すアイコン */}
                    {post.track && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                        <span className="text-sm">音楽付き</span>
                      </div>
                    )}
                  </div>
                  
                  {/* 詳細表示リンク（将来の機能） */}
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    詳細を見る →
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
} 