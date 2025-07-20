'use client'

import { useState, useEffect } from 'react'

interface FollowButtonProps {
  targetUserId: string
  currentUserId: string
  onFollowChange?: (isFollowing: boolean) => void
}

export default function FollowButton({ 
  targetUserId, 
  currentUserId, 
  onFollowChange 
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    checkStatuses()
  }, [targetUserId, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkStatuses = async () => {
    try {
      const [followResponse, blockResponse] = await Promise.all([
        fetch(`/api/users/${targetUserId}/follow?currentUserId=${currentUserId}`),
        fetch(`/api/users/${targetUserId}/block?currentUserId=${currentUserId}`)
      ])
      
      const followData = await followResponse.json()
      const blockData = await blockResponse.json()
      
      setIsFollowing(followData.isFollowing)
      setIsBlocked(blockData.isBlocking || blockData.isBlockedBy)
    } catch (error) {
      console.error('Error checking statuses:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleFollowToggle = async () => {
    if (loading) return

    setLoading(true)
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${targetUserId}/follow`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followerId: currentUserId }),
      })

      if (response.ok) {
        const newFollowStatus = !isFollowing
        setIsFollowing(newFollowStatus)
        onFollowChange?.(newFollowStatus)
      } else {
        const error = await response.json()
        console.error('Follow action failed:', error)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <button 
        disabled 
        className="px-4 py-2 bg-gray-200 text-gray-500 rounded-md cursor-not-allowed"
      >
        読み込み中...
      </button>
    )
  }

  if (targetUserId === currentUserId) {
    return null
  }

  // ブロック関係がある場合はフォローボタンを表示しない
  if (isBlocked) {
    return null
  }

  return (
    <button
      onClick={handleFollowToggle}
      disabled={loading}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        '処理中...'
      ) : isFollowing ? (
        'フォロー中'
      ) : (
        'フォロー'
      )}
    </button>
  )
}