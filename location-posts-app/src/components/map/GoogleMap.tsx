"use client"
import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

/// <reference types="google.maps" />

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
  onStartPhotoGame?: (postId: string, imageUrl: string) => void
}

export default function GoogleMap({ posts, onLocationSelect, onStartPhotoGame }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [, setMap] = useState<google.maps.Map | null>(null)
  const [, setUserLocation] = useState<{lat: number, lng: number} | null>(null)

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

              // InfoWindowのコンテンツをDOM要素で作成
              const infoWindowContent = document.createElement('div')
              infoWindowContent.style.cssText = 'padding: 8px; max-width: 300px;'
              
              const authorDiv = document.createElement('div')
              authorDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;'
              
              const authorImg = document.createElement('img')
              authorImg.src = post.author.image || '/default-avatar.png'
              authorImg.alt = post.author.name
              authorImg.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; margin-right: 8px;'
              
              const authorName = document.createElement('span')
              authorName.textContent = post.author.name
              authorName.style.fontWeight = 'bold'
              
              authorDiv.appendChild(authorImg)
              authorDiv.appendChild(authorName)
              infoWindowContent.appendChild(authorDiv)

              // 画像がある場合は表示
              if (post.imageUrl) {
                const postImg = document.createElement('img')
                postImg.src = post.imageUrl
                postImg.alt = 'Post image'
                postImg.style.cssText = 'width: 100%; height: 150px; object-fit: cover; margin-bottom: 8px; border-radius: 8px;'
                infoWindowContent.appendChild(postImg)
              }

              // コンテンツ表示
              if (post.content) {
                const contentP = document.createElement('p')
                contentP.textContent = post.content
                contentP.style.cssText = 'margin: 0 0 8px 0; font-size: 14px;'
                infoWindowContent.appendChild(contentP)
              }

              // 音楽がある場合は表示
              if (post.musicUrl) {
                const audio = document.createElement('audio')
                audio.controls = true
                audio.style.cssText = 'width: 100%; margin-bottom: 8px;'
                const source = document.createElement('source')
                source.src = post.musicUrl
                source.type = 'audio/mpeg'
                audio.appendChild(source)
                infoWindowContent.appendChild(audio)
              }

              // 写真ゲームボタン（画像がある場合のみ）
              if (post.imageUrl && onStartPhotoGame) {
                const gameButton = document.createElement('button')
                gameButton.textContent = '写真ゲームに挑戦'
                gameButton.style.cssText = 'background: #3b82f6; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;'
                gameButton.addEventListener('click', () => {
                  onStartPhotoGame(post.id, post.imageUrl!)
                })
                infoWindowContent.appendChild(gameButton)
              }

              const infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent
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
  }, [posts, onLocationSelect, onStartPhotoGame])

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}