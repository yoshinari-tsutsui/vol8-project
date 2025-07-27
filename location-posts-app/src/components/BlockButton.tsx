'use client'

import { useState, useEffect } from 'react'

interface BlockButtonProps {
  targetUserId: string
  currentUserId: string
  onBlockChange?: (isBlocking: boolean) => void
}

export default function BlockButton({ 
  targetUserId, 
  currentUserId, 
  onBlockChange 
}: BlockButtonProps) {
  const [isBlocking, setIsBlocking] = useState(false)
  const [isBlockedBy, setIsBlockedBy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    checkBlockStatus()
  }, [targetUserId, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const checkBlockStatus = async () => {
    try {
      const response = await fetch(
        `/api/users/${targetUserId}/block?currentUserId=${currentUserId}`
      )
      const data = await response.json()
      setIsBlocking(data.isBlocking)
      setIsBlockedBy(data.isBlockedBy)
    } catch (error) {
      console.error('Error checking block status:', error)
    } finally {
      setCheckingStatus(false)
    }
  }

  const handleBlockToggle = async () => {
    if (loading) return

    // ブロック確認ダイアログ
    if (!isBlocking && !showConfirm) {
      setShowConfirm(true)
      return
    }

    setLoading(true)
    setShowConfirm(false)
    
    try {
      const method = isBlocking ? 'DELETE' : 'POST'
      const response = await fetch(`/api/users/${targetUserId}/block`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockerId: currentUserId }),
      })

      if (response.ok) {
        const newBlockStatus = !isBlocking
        setIsBlocking(newBlockStatus)
        onBlockChange?.(newBlockStatus)
      } else {
        const error = await response.json()
        console.error('Block action failed:', error)
      }
    } catch (error) {
      console.error('Error toggling block:', error)
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <button 
        disabled 
        className="px-2 sm:px-3 py-1 bg-gray-200 text-gray-500 rounded text-xs sm:text-sm cursor-not-allowed"
      >
        読み込み中...
      </button>
    )
  }

  if (targetUserId === currentUserId) {
    return null
  }

  // ブロックされている場合は表示しない
  if (isBlockedBy) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={handleBlockToggle}
        disabled={loading}
        className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
          isBlocking
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          '処理中...'
        ) : isBlocking ? (
          'ブロック解除'
        ) : (
          'ブロック'
        )}
      </button>

      {/* ブロック確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-sm w-full">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">ユーザーをブロックしますか？</h3>
            <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-sm">
              ブロックすると、このユーザーはあなたをフォローできなくなり、
              相互のフォロー関係も解除されます。
            </p>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleBlockToggle}
                className="flex-1 px-3 sm:px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                ブロック
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}