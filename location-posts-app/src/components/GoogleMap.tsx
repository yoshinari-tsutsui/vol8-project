"use client"
import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

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

interface GoogleMapProps {
  posts: Post[]
  onLocationSelect: (lat: number, lng: number, address?: string) => void
}

export default function GoogleMap({ posts, onLocationSelect }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: 'weekly',
        libraries: ['places', 'geometry']
      })

      const { Map } = await loader.importLibrary('maps')
      const { Marker } = await loader.importLibrary('marker')

      // 現在地を取得
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
            setUserLocation(pos)
            
            // マップを初期化
            const mapInstance = new Map(mapRef.current!, {
              center: pos,
              zoom: 15,
              mapTypeId: 'roadmap'
            })
            setMap(mapInstance)

            // 現在地マーカー
            new Marker({
              position: pos,
              map: mapInstance,
              title: 'Your Location',
              icon: {
                url: '/current-location-icon.png',
                scaledSize: new google.maps.Size(40, 40)
              }
            })

            // 投稿マーカーを追加
            posts.forEach(post => {
              const marker = new Marker({
                position: { lat: post.latitude, lng: post.longitude },
                map: mapInstance,
                title: post.content || 'Post'
              })

              // 投稿詳細のInfoWindow
              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div class="p-2">
                    <div class="flex items-center mb-2">
                      <img src="${post.author.image || '/default-avatar.png'}" 
                           alt="${post.author.name}" 
                           class="w-8 h-8 rounded-full mr-2">
                      <span class="font-medium">${post.author.name}</span>
                    </div>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="w-48 h-32 object-cover mb-2 rounded">` : ''}
                    ${post.content ? `<p class="mb-2">${post.content}</p>` : ''}
                    ${post.musicUrl ? `<audio controls class="w-full"><source src="${post.musicUrl}" type="audio/mpeg"></audio>` : ''}
                    <button onclick="startPhotoGame('${post.id}')" class="bg-blue-500 text-white px-3 py-1 rounded mt-2">
                      写真ゲームに挑戦
                    </button>
                  </div>
                `
              })

              marker.addListener('click', () => {
                infoWindow.open(mapInstance, marker)
              })
            })

            // マップクリックでの投稿位置選択
            mapInstance.addListener('click', async (e: google.maps.MapMouseEvent) => {
              if (e.latLng) {
                const lat = e.latLng.lat()
                const lng = e.latLng.lng()
                
                // 逆ジオコーディングで住所取得
                const geocoder = new google.maps.Geocoder()
                try {
                  const result = await geocoder.geocode({ location: { lat, lng } })
                  const address = result.results[0]?.formatted_address
                  onLocationSelect(lat, lng, address)
                } catch (error) {
                  console.error('Geocoding failed:', error)
                  onLocationSelect(lat, lng)
                }
              }
            })
          },
          (error) => {
            console.error('Geolocation failed:', error)
            // デフォルト位置（東京）
            const defaultPos = { lat: 35.6762, lng: 139.6503 }
            const mapInstance = new Map(mapRef.current!, {
              center: defaultPos,
              zoom: 15
            })
            setMap(mapInstance)
          }
        )
      }
    }

    if (mapRef.current) {
      initMap()
    }
  }, [posts, onLocationSelect])

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}