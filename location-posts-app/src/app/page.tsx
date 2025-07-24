"use client"
import { useSession, signIn } from "next-auth/react"
import { useState, useEffect } from "react"
import Image from 'next/image'
import Link from 'next/link'

interface Reply {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    username?: string
    displayName?: string
    avatarUrl?: string
  }
}

interface Post {
  id: string
  content?: string
  imageUrl?: string
  musicUrl?: string
  latitude: number
  longitude: number
  address?: string
  createdAt: string
  author: {
    id: string
    username?: string
    displayName?: string
    avatarUrl?: string
  }
  _count?: {
    likes: number
    replies: number
  }
}

export default function Home() {
  const { data: session, status } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replies, setReplies] = useState<Record<string, Reply[]>>({})
  const [showMoreReplies, setShowMoreReplies] = useState<Set<string>>(new Set())
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (session) {
      fetchPosts()
    }
  }, [session])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      const data = await response.json()
      
      // dataが配列かどうかチェック
      if (!Array.isArray(data)) {
        console.error('Posts data is not an array:', data)
        return
      }
      
      setPosts(data)
      
      // 現在のユーザーがいいねした投稿を取得
      if (session?.user?.email && data.length > 0) {
        const likedPostIds = new Set<string>()
        for (const post of data) {
          try {
            const likeResponse = await fetch(`/api/posts/${post.id}/likes/user`)
            if (likeResponse.ok) {
              const { liked } = await likeResponse.json()
              if (liked) {
                likedPostIds.add(post.id)
              }
            }
          } catch (error) {
            console.error('Failed to check like status:', error)
          }
        }
        setLikedPosts(likedPostIds)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    }
  }

  const handleLike = async (postId: string) => {
    try {
      console.log('Liking post:', postId)
      const response = await fetch(`/api/posts/${postId}/likes`, {
        method: 'POST'
      })
      
      console.log('Like response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Like result:', result)
        const { liked } = result
        
        setLikedPosts(prev => {
          const newSet = new Set(prev)
          if (liked) {
            newSet.add(postId)
          } else {
            newSet.delete(postId)
          }
          return newSet
        })
        
        // 投稿のいいね数を更新
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              _count: {
                ...post._count,
                likes: (post._count?.likes || 0) + (liked ? 1 : -1),
                replies: post._count?.replies || 0
              }
            }
          }
          return post
        }))
      } else {
        const errorText = await response.text()
        console.error('Like failed:', response.status, errorText)
      }
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  const handleReply = async (postId: string) => {
    if (!replyContent.trim()) return
    
    try {
      console.log('Replying to post:', postId, 'with content:', replyContent)
      const response = await fetch(`/api/posts/${postId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: replyContent
        })
      })
      
      console.log('Reply response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Reply result:', result)
        
        // 返信数を更新
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              _count: {
                likes: post._count?.likes || 0,
                replies: (post._count?.replies || 0) + 1
              }
            }
          }
          return post
        }))
        
        setReplyContent('')
        setReplyingTo(null)
        
        // 返信を即座に表示するために再取得
        await fetchReplies(postId)
      } else {
        const errorText = await response.text()
        console.error('Reply failed:', response.status, errorText)
      }
    } catch (error) {
      console.error('Failed to reply:', error)
    }
  }

  const fetchReplies = async (postId: string) => {
    if (loadingReplies.has(postId)) return
    
    setLoadingReplies(prev => new Set(prev).add(postId))
    
    try {
      const response = await fetch(`/api/posts/${postId}/replies`)
      if (response.ok) {
        const repliesData = await response.json()
        setReplies(prev => ({
          ...prev,
          [postId]: repliesData
        }))
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error)
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev)
        newSet.delete(postId)
        return newSet
      })
    }
  }

  const toggleRepliesVisibility = async (postId: string) => {
    if (!replies[postId]) {
      await fetchReplies(postId)
    }
    
    setShowMoreReplies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  const handleSignIn = async () => {
    await signIn("google", { 
      callbackUrl: window.location.href,
      scope: "openid email profile"
    })
  }

  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-24"></div>
                  <div className="h-3 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">タイムラインを見る</h1>
          <p className="text-gray-600 mb-6">
            サインインして友達の投稿をチェックしよう
          </p>
          <button 
            onClick={handleSignIn}
            className="bg-blue-500 text-white px-6 py-3 rounded-full text-lg hover:bg-blue-600 transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* タイムライン */}
      <div className="space-y-6">
        {posts
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow-sm p-6">
            {/* ユーザー情報 */}
            <div className="flex items-center space-x-3 mb-4">
              <Link href={`/profile/${post.author.id}`} className="flex-shrink-0">
                <img
                  src={post.author.avatarUrl || '/default-avatar.png'}
                  alt={`${post.author.displayName || post.author.username} avatar`}
                  className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer"
                />
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  <Link href={`/profile/${post.author.id}`} className="hover:underline">
                    <h3 className="font-semibold">{post.author.displayName || post.author.username}</h3>
                  </Link>
                  <Link href={`/profile/${post.author.id}`} className="hover:underline">
                    <span className="text-gray-500 text-sm">@{post.author.username}</span>
                  </Link>
                  <span className="text-gray-500 text-sm">·</span>
                  <span className="text-gray-500 text-sm">
                    {new Date(post.createdAt).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {post.address && (
                  <div className="flex items-center text-gray-500 text-sm">
                    <span className="mr-1">📍</span>
                    {post.address}
                  </div>
                )}
              </div>
            </div>

            {/* 投稿内容 */}
            {post.content && (
              <div className="mb-4">
                <p className="text-gray-800 leading-relaxed">{post.content}</p>
              </div>
            )}

            {/* 画像 */}
            {post.imageUrl && (
              <div className="mb-4">
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="rounded-lg w-full max-h-96 object-cover"
                />
              </div>
            )}

            {/* 音楽 */}
            {post.musicUrl && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-purple-600">🎵</span>
                  <span className="text-sm text-purple-700">音楽が添付されています</span>
                </div>
              </div>
            )}

            {/* アクション */}
            <div className="flex justify-start items-center space-x-8 pt-4 border-t border-gray-100">
              <button 
                onClick={() => handleLike(post.id)}
                className={`flex items-center space-x-2 transition-colors ${
                  likedPosts.has(post.id) 
                    ? 'text-red-500' 
                    : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <span className="text-lg">
                  {likedPosts.has(post.id) ? '❤️' : '♡'}
                </span>
                <span className="text-sm">{post._count?.likes || 0}</span>
              </button>
              <button 
                onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <span>💬</span>
                <span className="text-sm">{post._count?.replies || 0}</span>
              </button>
              {(post._count?.replies || 0) > 0 && (
                <button 
                  onClick={() => toggleRepliesVisibility(post.id)}
                  className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                >
                  {showMoreReplies.has(post.id) ? '返信を隠す' : '返信を見る'}
                </button>
              )}
            </div>

            {/* 返信表示 */}
            {showMoreReplies.has(post.id) && replies[post.id] && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                {loadingReplies.has(post.id) ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replies[post.id]
                      .slice(0, showMoreReplies.has(post.id) ? (replies[post.id].length > 3 ? 3 : replies[post.id].length) : 3)
                      .map((reply) => (
                      <div key={reply.id} className="flex space-x-3">
                        <Link href={`/profile/${reply.author.id}`} className="flex-shrink-0">
                          <img
                            src={reply.author.avatarUrl || '/default-avatar.png'}
                            alt={`${reply.author.displayName || reply.author.username} avatar`}
                            className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer"
                          />
                        </Link>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <Link href={`/profile/${reply.author.id}`} className="hover:underline">
                                <span className="font-semibold text-sm">
                                  {reply.author.displayName || reply.author.username}
                                </span>
                              </Link>
                              <Link href={`/profile/${reply.author.id}`} className="hover:underline">
                                <span className="text-gray-500 text-xs">
                                  @{reply.author.username}
                                </span>
                              </Link>
                              <span className="text-gray-500 text-xs">·</span>
                              <span className="text-gray-500 text-xs">
                                {new Date(reply.createdAt).toLocaleDateString('ja-JP', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {replies[post.id].length > 3 && !showMoreReplies.has(post.id + '_all') && (
                      <button
                        onClick={() => setShowMoreReplies(prev => new Set(prev).add(post.id + '_all'))}
                        className="text-sm text-blue-500 hover:text-blue-600 transition-colors ml-11"
                      >
                        続きを読む ({replies[post.id].length - 3}件の返信)
                      </button>
                    )}
                    
                    {showMoreReplies.has(post.id + '_all') && replies[post.id].length > 3 && (
                      <div className="space-y-3">
                        {replies[post.id].slice(3).map((reply) => (
                          <div key={reply.id} className="flex space-x-3">
                            <Link href={`/profile/${reply.author.id}`} className="flex-shrink-0">
                              <img
                                src={reply.author.avatarUrl || '/default-avatar.png'}
                                alt={`${reply.author.displayName || reply.author.username} avatar`}
                                className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer"
                              />
                            </Link>
                            <div className="flex-1">
                              <div className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Link href={`/profile/${reply.author.id}`} className="hover:underline">
                                    <span className="font-semibold text-sm">
                                      {reply.author.displayName || reply.author.username}
                                    </span>
                                  </Link>
                                  <Link href={`/profile/${reply.author.id}`} className="hover:underline">
                                    <span className="text-gray-500 text-xs">
                                      @{reply.author.username}
                                    </span>
                                  </Link>
                                  <span className="text-gray-500 text-xs">·</span>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(reply.createdAt).toLocaleDateString('ja-JP', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-800">{reply.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 返信フォーム */}
            {replyingTo === post.id && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="flex space-x-3">
                  <img
                    src={session?.user?.image || '/default-avatar.png'}
                    alt="Your avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="返信を投稿"
                      className="w-full p-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      rows={2}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent('')
                        }}
                        className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleReply(post.id)}
                        disabled={!replyContent.trim()}
                        className="px-4 py-1 text-sm bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        返信
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {posts.length === 0 && session && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <span className="text-6xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">まだ投稿がありません</h3>
            <p className="text-gray-500">
              最初の投稿を作成して、みんなと共有しましょう！
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
