"use client"
import { useSession, signIn } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
  track?: {
    id: string
    name: string
    artists: Array<{ id: string; name: string }>
    album: {
      id: string
      name: string
      images: Array<{ url: string; width: number; height: number }>
    }
    preview_url?: string
    external_urls?: { spotify: string }
  }
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
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replies, setReplies] = useState<Record<string, Reply[]>>({})
  const [showMoreReplies, setShowMoreReplies] = useState<Set<string>>(new Set())
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set())

  const fetchPosts = useCallback(async () => {
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
  }, [session])

  useEffect(() => {
    if (session) {
      fetchPosts()
    }
  }, [session, fetchPosts])

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

  const handleLocationClick = (lat: number, lng: number) => {
    // マップページに移動し、その位置にフォーカス
    router.push(`/map?lat=${lat}&lng=${lng}&zoom=16`)
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
            <div key={i} className="bg-white-foam rounded-lg p-6 shadow-sm border border-cappuccino/30">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-cappuccino rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-cappuccino rounded w-24"></div>
                  <div className="h-3 bg-latte rounded w-16"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-latte rounded"></div>
                <div className="h-4 bg-latte rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream via-latte to-cappuccino flex items-center justify-center p-4 relative overflow-hidden">
        {/* 背景装飾 - カフェの雰囲気を演出 */}
        <div className="absolute inset-0">
          {/* コーヒー豆の装飾 */}
          <div className="absolute top-20 left-10 w-4 h-6 bg-coffee-dark rounded-full opacity-10 transform rotate-12 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-3 h-5 bg-coffee-medium rounded-full opacity-20 transform -rotate-12 animate-pulse delay-1000"></div>
          <div className="absolute bottom-32 left-20 w-5 h-7 bg-espresso rounded-full opacity-15 transform rotate-45 animate-pulse delay-2000"></div>
          <div className="absolute bottom-20 right-16 w-4 h-6 bg-coffee-dark rounded-full opacity-10 transform -rotate-45 animate-pulse delay-3000"></div>
          
          {/* 湯気のような曲線 */}
          <div className="absolute top-16 right-32 w-20 h-20 border-2 border-coffee-light/20 rounded-full animate-pulse"></div>
          <div className="absolute top-24 right-40 w-16 h-16 border-2 border-coffee-medium/15 rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-40 left-32 w-24 h-24 border-2 border-cinnamon/20 rounded-full animate-pulse delay-1500"></div>
        </div>

        <div className="max-w-md mx-auto relative z-10">
          <div className="bg-white-foam/95 backdrop-blur-sm rounded-2xl shadow-2xl p-10 text-center border border-cappuccino/40 relative overflow-hidden">
            {/* カードの装飾 */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-coffee-medium via-cinnamon to-coffee-light"></div>
            
            {/* カフェアイコン */}
            <div className="mb-8 relative">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-coffee-medium to-cinnamon rounded-full shadow-lg mb-4 relative">
                <span className="text-3xl text-white-foam">☕</span>
                {/* 湯気エフェクト */}
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <div className="w-1 h-8 bg-gradient-to-t from-coffee-light/60 to-transparent rounded-full animate-pulse"></div>
                  <div className="absolute left-1 w-1 h-6 bg-gradient-to-t from-coffee-medium/40 to-transparent rounded-full animate-pulse delay-300"></div>
                  <div className="absolute -left-1 w-1 h-7 bg-gradient-to-t from-cinnamon/50 to-transparent rounded-full animate-pulse delay-700"></div>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-espresso mb-2">
                Welcome to
              </h1>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-coffee-dark via-coffee-medium to-cinnamon bg-clip-text text-transparent mb-4">
                Mappuccino
              </h2>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <p className="text-coffee-medium text-lg mb-2 leading-relaxed">
                  位置と思い出を共有する
                </p>
                <p className="text-coffee-light text-sm">
                  あなたの特別な瞬間をマップに刻もう
                </p>
              </div>

              {/* 特徴のアイコン */}
              <div className="flex justify-center space-x-8 py-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-latte rounded-full flex items-center justify-center mb-2 mx-auto shadow-md">
                    <span className="text-xl">📍</span>
                  </div>
                  <p className="text-xs text-coffee-medium">位置共有</p>
                </div>
                <div className="text-center">  
                  <div className="w-12 h-12 bg-latte rounded-full flex items-center justify-center mb-2 mx-auto shadow-md">
                    <span className="text-xl">📸</span>
                  </div>
                  <p className="text-xs text-coffee-medium">写真投稿</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-latte rounded-full flex items-center justify-center mb-2 mx-auto shadow-md">
                    <span className="text-xl">🎵</span>
                  </div>
                  <p className="text-xs text-coffee-medium">音楽共有</p>
                </div>
              </div>

              <button 
                onClick={handleSignIn}
                className="w-full bg-gradient-to-r from-coffee-medium to-cinnamon text-white-foam px-8 py-4 rounded-full text-lg font-semibold hover:from-cinnamon hover:to-coffee-light transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center space-x-3 border-2 border-coffee-dark/30 hover:border-coffee-dark/50"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>

              <p className="text-coffee-light text-xs leading-relaxed">
                サインインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
              </p>
            </div>
          </div>
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
          <div key={post.id} className="bg-white-foam rounded-lg shadow-sm p-6 border border-cappuccino/30">
            {/* ユーザー情報 */}
            <div className="flex items-center space-x-3 mb-4">
              <Link href={`/profile/${post.author.id}`} className="flex-shrink-0">
                <Image
                  src={post.author.avatarUrl || '/default-avatar.png'}
                  alt={`${post.author.displayName || post.author.username} avatar`}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-cinnamon transition-all cursor-pointer"
                />
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  <Link href={`/profile/${post.author.id}`} className="hover:underline">
                    <h3 className="font-semibold text-espresso">{post.author.displayName || post.author.username}</h3>
                  </Link>
                  <Link href={`/profile/${post.author.id}`} className="hover:underline">
                    <span className="text-coffee-medium text-sm">@{post.author.username}</span>
                  </Link>
                  <span className="text-coffee-medium text-sm">·</span>
                  <span className="text-coffee-medium text-sm">
                    {new Date(post.createdAt).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {post.address && (
                  <button
                    onClick={() => handleLocationClick(post.latitude, post.longitude)}
                    className="flex items-center text-coffee-medium text-sm hover:text-cinnamon hover:bg-latte rounded-md px-2 py-1 transition-colors cursor-pointer"
                    title="地図で場所を見る"
                  >
                    <span className="mr-1">📍</span>
                    <span className="truncate max-w-[200px]">{post.address}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 投稿内容 */}
            {post.content && (
              <div className="mb-4">
                <p className="text-coffee-dark leading-relaxed">{post.content}</p>
              </div>
            )}

            {/* 画像 */}
            {post.imageUrl && (
              <div className="mb-4">
                <Image
                  src={post.imageUrl}
                  alt="Post image"
                  width={600}
                  height={400}
                  className="rounded-lg w-full max-h-96 object-cover"
                />
              </div>
            )}

            {/* 音楽 */}
            {(post.musicUrl || post.track) && (
              <div className="mb-4 p-3 bg-gradient-to-r from-latte to-cappuccino rounded-lg border border-coffee-light/30">
                {post.track ? (
                  <div className="flex items-center space-x-3">
                    {/* アルバムアート */}
                    {post.track.album?.images && post.track.album.images.length > 0 ? (
                      <Image
                        src={post.track.album.images[0].url}
                        alt="Album art"
                        width={48}
                        height={48}
                        className="rounded-md shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-coffee-light rounded-md flex items-center justify-center">
                        <span className="text-coffee-medium text-lg">🎵</span>
                      </div>
                    )}
                    
                    {/* 楽曲情報 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-espresso truncate">
                        {post.track.name}
                      </p>
                      <p className="text-sm text-coffee-medium truncate">
                        {post.track.artists.map(artist => artist.name).join(', ')}
                      </p>
                      <p className="text-xs text-coffee-light truncate">
                        {post.track.album.name}
                      </p>
                    </div>
                    
                    {/* Spotifyリンク */}
                    {post.track.external_urls?.spotify && (
                      <a
                        href={post.track.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center space-x-1"
                      >
                        <span>🎧</span>
                        <span>Spotify</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-coffee-medium">🎵</span>
                    <span className="text-sm text-coffee-dark">音楽が添付されています</span>
                  </div>
                )}
              </div>
            )}

            {/* アクション */}
            <div className="flex justify-start items-center space-x-8 pt-4 border-t border-cappuccino/50">
              <button 
                onClick={() => handleLike(post.id)}
                className={`flex items-center space-x-2 transition-colors ${
                  likedPosts.has(post.id) 
                    ? 'text-red-500' 
                    : 'text-coffee-medium hover:text-red-500'
                }`}
              >
                <span className="text-lg">
                  {likedPosts.has(post.id) ? '❤️' : '♡'}
                </span>
                <span className="text-sm">{post._count?.likes || 0}</span>
              </button>
              <button 
                onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                className="flex items-center space-x-2 text-coffee-medium hover:text-cinnamon transition-colors"
              >
                <span>💬</span>
                <span className="text-sm">{post._count?.replies || 0}</span>
              </button>
              {(post._count?.replies || 0) > 0 && (
                <button 
                  onClick={() => toggleRepliesVisibility(post.id)}
                  className="text-sm text-cinnamon hover:text-coffee-medium transition-colors"
                >
                  {showMoreReplies.has(post.id) ? '返信を隠す' : '返信を見る'}
                </button>
              )}
            </div>

            {/* 返信表示 */}
            {showMoreReplies.has(post.id) && replies[post.id] && (
              <div className="mt-4 border-t border-cappuccino/50 pt-4">
                {loadingReplies.has(post.id) ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cinnamon mx-auto"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replies[post.id]
                      .slice(0, showMoreReplies.has(post.id) ? (replies[post.id].length > 3 ? 3 : replies[post.id].length) : 3)
                      .map((reply) => (
                      <div key={reply.id} className="flex space-x-3">
                        <Link href={`/profile/${reply.author.id}`} className="flex-shrink-0">
                          <Image
                            src={reply.author.avatarUrl || '/default-avatar.png'}
                            alt={`${reply.author.displayName || reply.author.username} avatar`}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-cinnamon transition-all cursor-pointer"
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
                        className="text-sm text-cinnamon hover:text-coffee-medium transition-colors ml-11"
                      >
                        続きを読む ({replies[post.id].length - 3}件の返信)
                      </button>
                    )}
                    
                    {showMoreReplies.has(post.id + '_all') && replies[post.id].length > 3 && (
                      <div className="space-y-3">
                        {replies[post.id].slice(3).map((reply) => (
                          <div key={reply.id} className="flex space-x-3">
                            <Link href={`/profile/${reply.author.id}`} className="flex-shrink-0">
                              <Image
                                src={reply.author.avatarUrl || '/default-avatar.png'}
                                alt={`${reply.author.displayName || reply.author.username} avatar`}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-cinnamon transition-all cursor-pointer"
                              />
                            </Link>
                            <div className="flex-1">
                              <div className="bg-latte rounded-lg p-3">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Link href={`/profile/${reply.author.id}`} className="hover:underline">
                                    <span className="font-semibold text-sm text-espresso">
                                      {reply.author.displayName || reply.author.username}
                                    </span>
                                  </Link>
                                  <Link href={`/profile/${reply.author.id}`} className="hover:underline">
                                    <span className="text-coffee-medium text-xs">
                                      @{reply.author.username}
                                    </span>
                                  </Link>
                                  <span className="text-coffee-medium text-xs">·</span>
                                  <span className="text-coffee-medium text-xs">
                                    {new Date(reply.createdAt).toLocaleDateString('ja-JP', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-coffee-dark">{reply.content}</p>
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
              <div className="mt-4 border-t border-cappuccino/50 pt-4">
                <div className="flex space-x-3">
                  <Image
                    src={session?.user?.image || '/default-avatar.png'}
                    alt="Your avatar"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="返信を投稿"
                      className="w-full p-2 border border-cappuccino rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-cinnamon text-sm"
                      rows={2}
                    />
                    <div className="flex justify-end space-x-2 mt-2">
                      <button
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyContent('')
                        }}
                        className="px-3 py-1 text-sm text-coffee-medium hover:text-coffee-dark transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleReply(post.id)}
                        disabled={!replyContent.trim()}
                        className="px-4 py-1 text-sm bg-gradient-to-r from-coffee-medium to-cinnamon text-white-foam rounded-full hover:from-cinnamon hover:to-coffee-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
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
            <div className="text-coffee-light mb-4">
              <span className="text-6xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-espresso mb-2">まだ投稿がありません</h3>
            <p className="text-coffee-medium">
              最初の投稿を作成して、みんなと共有しましょう！
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
