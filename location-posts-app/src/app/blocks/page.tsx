'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import BlockButton from '@/components/BlockButton'

interface BlockedUser {
  id: string
  blockerId: string
  blockedId: string
  createdAt: string
  blocked: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
  }
}

export default function BlocksPage() {
  const { data: session, status } = useSession()
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  
  const currentUserId = (session?.user as { id: string })?.id

  const fetchBlockedUsers = useCallback(async () => {
    if (!currentUserId) return
    
    try {
      const response = await fetch(`/api/users/${currentUserId}/blocks`)
      if (response.ok) {
        const data = await response.json()
        setBlockedUsers(data)
      }
    } catch (error) {
      console.error('Error fetching blocked users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  useEffect(() => {
    if (currentUserId) {
      fetchBlockedUsers()
    }
  }, [currentUserId, fetchBlockedUsers])

  const handleUnblock = (userId: string) => {
    // ブロック解除後にリストを更新
    setBlockedUsers(prev => prev.filter(block => block.blocked.id !== userId))
  }

  if (status === "loading" || loading) {
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

  return (
    <div className="max-w-2xl mx-auto p-3 sm:p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 sm:p-6 border-b">
          <h1 className="text-xl sm:text-2xl font-bold">ブロックしたユーザー</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            ブロックしたユーザーの一覧です。ブロックを解除するには「ブロック解除」ボタンをクリックしてください。
          </p>
        </div>

        <div className="p-4 sm:p-6">
          {blockedUsers.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {blockedUsers.map((block) => (
                <div key={block.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                    {block.blocked.avatarUrl ? (
                      <Image
                        src={block.blocked.avatarUrl}
                        alt={block.blocked.displayName || block.blocked.username}
                        width={50}
                        height={50}
                        className="w-10 sm:w-12 h-10 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm sm:text-lg text-gray-500">
                          {(block.blocked.displayName || block.blocked.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-base sm:text-lg">
                        {block.blocked.displayName || block.blocked.username}
                      </p>
                      <p className="text-gray-600 text-sm sm:text-base">@{block.blocked.username}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        ブロック日: {new Date(block.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  
                  <BlockButton
                    targetUserId={block.blocked.id}
                    currentUserId={currentUserId}
                    onBlockChange={(isBlocking) => {
                      if (!isBlocking) {
                        handleUnblock(block.blocked.id)
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-500 text-base sm:text-lg mb-2">ブロックしているユーザーはいません</div>
              <p className="text-gray-400 text-sm sm:text-base">
                ユーザーをブロックすると、ここに表示されます。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}