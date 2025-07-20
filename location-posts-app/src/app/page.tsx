'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface User {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  _count?: {
    posts: number
    followers: number
    following: number
  }
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      // 全ユーザーを取得するAPIを仮で作成
      const userIds = ['user1', 'user2', 'user3', 'user4', 'user5']
      const userPromises = userIds.map(id => 
        fetch(`/api/users/${id}`).then(res => res.ok ? res.json() : null)
      )
      const userData = await Promise.all(userPromises)
      setUsers(userData.filter(user => user !== null))
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Location Posts App
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          写真と音楽を投稿して地図上で共有するアプリ
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">ユーザー一覧</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg">読み込み中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="block p-6 border rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-4 mb-4">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName || user.username}
                      width={60}
                      height={60}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-15 h-15 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xl text-gray-500">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {user.displayName || user.username}
                    </h3>
                    <p className="text-gray-600">@{user.username}</p>
                  </div>
                </div>
                
                {user.bio && (
                  <p className="text-gray-700 mb-4 text-sm line-clamp-3">
                    {user.bio}
                  </p>
                )}
                
                <div className="flex space-x-4 text-sm text-gray-600">
                  <span><strong>{user._count?.posts || 0}</strong> 投稿</span>
                  <span><strong>{user._count?.followers || 0}</strong> フォロワー</span>
                  <span><strong>{user._count?.following || 0}</strong> フォロー中</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">テスト用アカウント</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">現在ログイン中:</p>
            <p className="text-blue-600">user1 (Alice Johnson)</p>
          </div>
          <div>
            <p className="font-medium">機能テスト:</p>
            <p className="text-gray-600">他のユーザーのプロフィールでフォロー・ブロック機能をお試しください</p>
          </div>
        </div>
      </div>
    </div>
  )
}
