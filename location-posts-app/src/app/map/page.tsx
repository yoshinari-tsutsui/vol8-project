"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import GoogleMap from "@/components/map/GoogleMap"
import PhotoGameModal from "@/components/game/PhotoGameModel"
import PostCreat from "@/components/post/PostCreat"
import { setSpotifyAccessToken } from "@/lib/spotify"
import { SpotifyTrackInfo } from "@/types"

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
  author: {
    id: string
    username?: string
    displayName?: string
    avatarUrl?: string
  }
}

export default function MapPage() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(null)
  const [showPostForm, setShowPostForm] = useState(false)
  const [showPhotoGame, setShowPhotoGame] = useState(false)
  const [gameData, setGameData] = useState<{postId: string, imageUrl: string} | null>(null)
  const [initialCenter, setInitialCenter] = useState<{lat: number, lng: number, zoom?: number} | null>(null)

  // URLパラメータ処理（位置情報とSpotify認証）
  useEffect(() => {
    const spotifyToken = searchParams.get('spotify_token')
    const error = searchParams.get('error')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const zoom = searchParams.get('zoom')
    
    // 位置情報パラメータがある場合、マップの初期中央位置を設定
    if (lat && lng) {
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lng)
      const zoomLevel = zoom ? parseInt(zoom) : 16
      
      if (!isNaN(latitude) && !isNaN(longitude)) {
        console.log('📍 URLパラメータから位置情報を取得:', { lat: latitude, lng: longitude, zoom: zoomLevel })
        setInitialCenter({ lat: latitude, lng: longitude, zoom: zoomLevel })
        
        // URLパラメータをクリーンアップ
        const url = new URL(window.location.href)
        url.searchParams.delete('lat')
        url.searchParams.delete('lng')
        url.searchParams.delete('zoom')
        window.history.replaceState({}, '', url.toString())
      }
    }
    
    if (spotifyToken) {
      setSpotifyAccessToken(spotifyToken)
      
      // URLからパラメータを削除
      const url = new URL(window.location.href)
      url.searchParams.delete('spotify_token')
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
    } else if (error) {
      console.error('Spotify認証エラー:', error)
      
      // URLからエラーパラメータを削除
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  useEffect(() => {
    if (session) {
      fetchPosts()
    }
  }, [session])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      const data = await response.json()
      console.log('🗺️ 地図ページで投稿データ取得:', {
        postsCount: data.length,
        postsWithMusic: data.filter((post: Post) => post.track || post.musicUrl).length,
        postsWithTrack: data.filter((post: Post) => post.track).length,
        postsWithMusicUrl: data.filter((post: Post) => post.musicUrl).length,
        samplePost: data[0] ? {
          id: data[0].id,
          hasTrack: !!data[0].track,
          hasMusicUrl: !!data[0].musicUrl,
          trackInfo: data[0].track ? {
            name: data[0].track.name,
            albumName: data[0].track.album.name,
            hasAlbumImages: !!data[0].track.album.images,
            imagesCount: data[0].track.album.images?.length || 0
          } : null
        } : null
      });
      setPosts(data)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    }
  }

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setSelectedLocation({ lat, lng, address })
    setShowPostForm(true)
  }

  const handlePostSubmit = async (postData: {
    content: string;
    imageFile: File | null;
    imageUrl?: string;
    musicUrl?: string;
    musicInfo?: SpotifyTrackInfo;
    location: { latitude: number; longitude: number; address?: string } | null;
  }) => {
    if (!postData.location) {
      alert('位置情報が必要です')
      return
    }

    try {
      let imageUrl = null;
      
      // 画像ファイルがある場合はアップロード
      if (postData.imageFile) {
        console.log('画像をアップロード中:', postData.imageFile.name);
        
        const formData = new FormData();
        formData.append('file', postData.imageFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.url;
          console.log('画像アップロード成功:', imageUrl);
        } else {
          console.error('画像アップロード失敗');
          alert('画像のアップロードに失敗しました');
          return;
        }
      }

      // ユーザー認証確認
      if (!session?.user?.email) {
        alert('ユーザー情報が取得できません。再度ログインしてください。');
        return;
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: postData.content,
          imageUrl,
          musicUrl: postData.musicUrl,
          musicInfo: postData.musicInfo,
          latitude: selectedLocation?.lat,
          longitude: selectedLocation?.lng,
          address: selectedLocation?.address,
          authorId: session.user.email, // セッションからユーザーemailを取得（APIでユーザーIDに変換）
        }),
      })

      if (response.ok) {
        await fetchPosts()
        setShowPostForm(false)
        setSelectedLocation(null)
        console.log('投稿が正常に作成されました')
      } else {
        const errorText = await response.text()
        console.error('Failed to create post:', errorText)
        alert('投稿の作成に失敗しました: ' + errorText)
      }
    } catch (error) {
      console.error('Failed to create post:', error)
      alert('投稿の作成に失敗しました: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  const handleStartPhotoGame = (postId: string, imageUrl: string) => {
    setGameData({ postId, imageUrl })
    setShowPhotoGame(true)
  }

  const handleClosePhotoGame = () => {
    setShowPhotoGame(false)
    setGameData(null)
  }

  if (status === "loading") {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinnamon mx-auto mb-4"></div>
          <p className="text-coffee-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-cream">
        <div className="text-center p-8 bg-white-foam rounded-lg shadow-md border border-cappuccino/30">
          <h2 className="text-xl font-bold text-espresso mb-4">サインインが必要です</h2>
          <p className="text-coffee-medium">マップを使用するにはサインインしてください。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex">
      <div className="flex-1">
        <GoogleMap 
          posts={posts} 
          onLocationSelect={handleLocationSelect}
          onStartPhotoGame={handleStartPhotoGame}
          initialCenter={initialCenter}
        />
      </div>
      
      {showPostForm && (
        <div className="fixed inset-0 z-50 bg-white sm:relative sm:w-[450px] sm:bg-white-foam shadow-lg overflow-y-auto max-h-full sm:border-l border-cappuccino/30">
          <PostCreat
            onPostCreate={handlePostSubmit}
            selectedLocation={selectedLocation}
            onCancel={() => {
              setShowPostForm(false)
              setSelectedLocation(null)
            }}
          />
        </div>
      )}

      {showPhotoGame && gameData && (
        <PhotoGameModal
          isOpen={showPhotoGame}
          onClose={handleClosePhotoGame}
          postId={gameData.postId}
          postImageUrl={gameData.imageUrl}
        />
      )}
    </div>
  )
}