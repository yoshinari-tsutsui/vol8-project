'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { User, Post } from '@/types'
import FollowButton from '@/components/FollowButton'
import BlockButton from '@/components/BlockButton'

export default function ProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const currentUserId = 'user1' // TODO: 実際の認証システムから取得
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    avatarUrl: ''
  })

  useEffect(() => {
    fetchUserProfile()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setPosts(userData.posts || [])
        setEditForm({
          displayName: userData.displayName || '',
          bio: userData.bio || '',
          avatarUrl: userData.avatarUrl || ''
        })
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">ユーザーが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* プロフィールヘッダー */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start space-x-6">
          <div className="relative">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                width={120}
                height={120}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-30 h-30 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-2xl text-gray-500">
                  {(user.displayName || user.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({...editForm, displayName: e.target.value})}
                  placeholder="表示名"
                  className="w-full p-2 border rounded-md"
                />
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  placeholder="自己紹介"
                  rows={3}
                  className="w-full p-2 border rounded-md resize-none"
                />
                <input
                  type="url"
                  value={editForm.avatarUrl}
                  onChange={(e) => setEditForm({...editForm, avatarUrl: e.target.value})}
                  placeholder="アバター画像URL"
                  className="w-full p-2 border rounded-md"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditProfile}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
                  <div className="flex space-x-2">
                    {currentUserId === userId ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        プロフィール編集
                      </button>
                    ) : (
                      <>
                        <FollowButton
                          targetUserId={userId}
                          currentUserId={currentUserId}
                          onFollowChange={() => {
                            // フォロー状態が変わったらプロフィールを再取得
                            fetchUserProfile()
                          }}
                        />
                        <BlockButton
                          targetUserId={userId}
                          currentUserId={currentUserId}
                          onBlockChange={() => {
                            // ブロック状態が変わったらプロフィールを再取得
                            fetchUserProfile()
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 mb-2">@{user.username}</p>
                {user.bio && <p className="text-gray-800 mb-4">{user.bio}</p>}

                <div className="flex space-x-6 text-sm text-gray-600">
                  <span><strong>{user._count?.posts || 0}</strong> 投稿</span>
                  <span><strong>{user._count?.followers || 0}</strong> フォロワー</span>
                  <span><strong>{user._count?.following || 0}</strong> フォロー中</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'posts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              投稿
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'followers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              フォロワー
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === 'following'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              フォロー中
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'posts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <div key={post.id} className="bg-gray-50 rounded-lg p-4">
                    {post.imageUrl && (
                      <Image
                        src={post.imageUrl}
                        alt="投稿画像"
                        width={300}
                        height={200}
                        className="rounded-md object-cover w-full h-48 mb-2"
                      />
                    )}
                    {post.content && (
                      <p className="text-gray-800 mb-2">{post.content}</p>
                    )}
                    {post.address && (
                      <p className="text-sm text-gray-600 mb-2">📍 {post.address}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">
                  投稿がありません
                </div>
              )}
            </div>
          )}

          {activeTab === 'followers' && (
            <div className="space-y-4">
              {user.followers && user.followers.length > 0 ? (
                user.followers.map((follow) => (
                  <div key={follow.follower.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {follow.follower.avatarUrl ? (
                        <Image
                          src={follow.follower.avatarUrl}
                          alt={follow.follower.displayName || follow.follower.username}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm text-gray-500">
                            {(follow.follower.displayName || follow.follower.username).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{follow.follower.displayName || follow.follower.username}</p>
                        <p className="text-sm text-gray-600">@{follow.follower.username}</p>
                      </div>
                    </div>
                    <FollowButton
                      targetUserId={follow.follower.id}
                      currentUserId={currentUserId}
                    />
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  フォロワーがいません
                </div>
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <div className="space-y-4">
              {user.following && user.following.length > 0 ? (
                user.following.map((follow) => (
                  <div key={follow.following.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {follow.following.avatarUrl ? (
                        <Image
                          src={follow.following.avatarUrl}
                          alt={follow.following.displayName || follow.following.username}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm text-gray-500">
                            {(follow.following.displayName || follow.following.username).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{follow.following.displayName || follow.following.username}</p>
                        <p className="text-sm text-gray-600">@{follow.following.username}</p>
                      </div>
                    </div>
                    <FollowButton
                      targetUserId={follow.following.id}
                      currentUserId={currentUserId}
                    />
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  フォローしているユーザーがいません
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}