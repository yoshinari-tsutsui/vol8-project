"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import GoogleMap from "@/components/map/GoogleMap"
import PhotoGameModal from "@/components/game/PhotoGameModel"
// import PostForm from "@/components/PostForm" // TODO: Create PostForm component

interface Post {
  id: string
  content?: string
  imageUrl?: string
  musicUrl?: string
  latitude: number
  longitude: number
  address?: string
  author: {
    name: string
    image?: string
  }
}

export default function MapPage() {
  const { data: session, status } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number
    lng: number
    address?: string
  } | null>(null)
  const [showPostForm, setShowPostForm] = useState(false)
  const [showPhotoGame, setShowPhotoGame] = useState(false)
  const [gameData, setGameData] = useState<{postId: string, imageUrl: string} | null>(null)

  useEffect(() => {
    if (session) {
      fetchPosts()
    }
  }, [session])

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts')
      const data = await response.json()
      setPosts(data)
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    }
  }

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setSelectedLocation({ lat, lng, address })
    setShowPostForm(true)
  }

  // const handlePostSubmit = async (postData: {
  //   content?: string;
  //   imageUrl?: string;
  //   musicUrl?: string;
  // }) => {
  //   try {
  //     const response = await fetch('/api/posts', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         ...postData,
  //         latitude: selectedLocation?.lat,
  //         longitude: selectedLocation?.lng,
  //         address: selectedLocation?.address,
  //       }),
  //     })
      
  //     if (response.ok) {
  //       await fetchPosts()
  //       setShowPostForm(false)
  //       setSelectedLocation(null)
  //     }
  //   } catch (error) {
  //     console.error('Failed to create post:', error)
  //   }
  // }

  const handleStartPhotoGame = (postId: string, imageUrl: string) => {
    setGameData({ postId, imageUrl })
    setShowPhotoGame(true)
  }

  const handleClosePhotoGame = () => {
    setShowPhotoGame(false)
    setGameData(null)
  }

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return <div>Please sign in to access the map.</div>
  }

  return (
    <div className="h-screen flex">
      <div className="flex-1">
        <GoogleMap 
          posts={posts} 
          onLocationSelect={handleLocationSelect}
          onStartPhotoGame={handleStartPhotoGame}
        />
      </div>
      
      {showPostForm && (
        <div className="w-96 bg-white shadow-lg p-4">
          <h2 className="text-xl font-bold mb-4">新しい投稿</h2>
          <p className="text-gray-600 mb-4">
            選択した位置: {selectedLocation?.address || `${selectedLocation?.lat.toFixed(4)}, ${selectedLocation?.lng.toFixed(4)}`}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                setShowPostForm(false)
                setSelectedLocation(null)
              }}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded"
            >
              キャンセル
            </button>
            <p className="text-sm text-gray-500 text-center">
              投稿機能は開発中です
            </p>
          </div>
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