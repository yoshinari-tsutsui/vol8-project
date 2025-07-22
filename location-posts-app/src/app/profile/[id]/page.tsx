'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { User, Post } from '@/types'
import FollowButton from '@/components/FollowButton'
import BlockButton from '@/components/BlockButton'
import Link from 'next/link'

export default function ProfilePage() {
  const params = useParams()
  const { data: session } = useSession()
  const userId = params.id as string
  const currentUserId = (session?.user as { id: string })?.id
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchUserProfile()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserProfile = async () => {
    try {
      console.log('Session data:', session)
      console.log('Current user ID from session:', currentUserId)
      console.log('Fetching user profile for:', userId)
      
      const response = await fetch(`/api/users/${userId}`)
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const userData = await response.json()
        console.log('User data received:', userData)
        setUser(userData)
        setPosts(userData.posts || [])
        setEditForm({
          displayName: userData.displayName || '',
          bio: userData.bio || '',
          avatarUrl: userData.avatarUrl || ''
        })
      } else {
        console.error('Failed to fetch user:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      
      // プレビュー用にFileReaderを使用
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditForm({
          ...editForm,
          avatarUrl: e.target?.result as string
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('avatar', file)
    formData.append('userId', userId)

    const response = await fetch('/api/upload/avatar', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('画像のアップロードに失敗しました')
    }

    const result = await response.json()
    return result.url
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) {
      return
    }

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // 投稿リストから削除
        setPosts(prevPosts => prevPosts.filter(post => post.id !== postId))
        // ユーザー情報を再取得して投稿数を更新
        fetchUserProfile()
      } else {
        const error = await response.json()
        alert(error.error || '投稿の削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('投稿の削除中にエラーが発生しました')
    }
  }

  const handleEditProfile = async () => {
    try {
      setUploading(true)
      let avatarUrl = editForm.avatarUrl

      // 新しいファイルが選択されている場合はアップロード
      if (selectedFile) {
        avatarUrl = await uploadImage(selectedFile)
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editForm,
          avatarUrl
        }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUser(updatedUser)
        setIsEditing(false)
        setSelectedFile(null)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('プロフィールの更新に失敗しました')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">ログインが必要です</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">
          ユーザーが見つかりません
          <br />
          <span className="text-sm text-gray-600">
            ユーザーID: {userId}
            <br />
            セッションユーザーID: {currentUserId}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 上部ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <Link 
          href="/"
          className="text-gray-600 hover:text-gray-900 flex items-center text-sm"
        >
          ← ホームに戻る
        </Link>
        {currentUserId === userId && (
          <button 
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm"
          >
            Sign Out
          </button>
        )}
      </div>

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
                  {(user.displayName || user.username || user.email || 'U').charAt(0).toUpperCase()}
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
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    アバター画像
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full p-2 border rounded-md text-sm"
                  />
                  {selectedFile && (
                    <div className="text-sm text-green-600">
                      選択されたファイル: {selectedFile.name}
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleEditProfile}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'アップロード中...' : '保存'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setSelectedFile(null)
                      setEditForm({
                        displayName: user?.displayName || '',
                        bio: user?.bio || '',
                        avatarUrl: user?.avatarUrl || ''
                      })
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold">{user.displayName || user.username || user.email || 'ユーザー'}</h1>
                  <div className="flex space-x-2">
                    {currentUserId === userId ? (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          プロフィール編集
                        </button>
                        <Link
                          href="/blocks"
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                        >
                          ブロックリスト
                        </Link>
                      </>
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
                <p className="text-gray-600 mb-2">@{user.username || user.email?.split('@')[0] || 'user'}</p>
                {user.bio && <p className="text-gray-800 mb-4">{user.bio}</p>}

                <div className="flex space-x-6 text-sm text-gray-600">
                  <span><strong>{posts.length}</strong> 投稿</span>
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
                  <div key={post.id} className="bg-gray-50 rounded-lg p-4 relative">
                    {currentUserId === userId && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        title="投稿を削除"
                      >
                        ×
                      </button>
                    )}
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
                            {(follow.follower.displayName || follow.follower.username || 'U').charAt(0).toUpperCase()}
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
                            {(follow.following.displayName || follow.following.username || 'U').charAt(0).toUpperCase()}
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