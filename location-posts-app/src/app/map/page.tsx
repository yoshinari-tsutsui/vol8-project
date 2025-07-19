"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import GoogleMap from "@/components/map/GoogleMap"
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

  const handlePostSubmit = async (postData: any) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...postData,
          latitude: selectedLocation?.lat,
          longitude: selectedLocation?.lng,
          address: selectedLocation?.address,
        }),
      })
      
      if (response.ok) {
        await fetchPosts()
        setShowPostForm(false)
        setSelectedLocation(null)
      }
    } catch (error) {
      console.error('Failed to create post:', error)
    }
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
        />
      </div>
      
      {showPostForm && (
        <div className="w-96 bg-white shadow-lg">
          <PostForm 
            onSubmit={handlePostSubmit}
            onCancel={() => {
              setShowPostForm(false)
              setSelectedLocation(null)
            }}
            selectedLocation={selectedLocation}
          />
        </div>
      )}
    </div>
  )
}