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
    id: string
    username?: string
    displayName?: string
    avatarUrl?: string
  }
}

interface GoogleMapProps {
  posts: Post[]
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  onStartPhotoGame?: (postId: string, imageUrl: string) => void
}

export default function GoogleMap({ posts, onLocationSelect, onStartPhotoGame }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(true)
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null)

  // 現在地を取得する関数
  const getCurrentLocation = () => {
    return new Promise<{lat: number, lng: number}>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          resolve(pos);
        },
        (error) => {
          console.error('Geolocation failed:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
          version: 'weekly',
          libraries: ['places', 'geometry']
        })

        const { Map } = await loader.importLibrary('maps')
        const { Marker } = await loader.importLibrary('marker')

        // 現在地を取得
        let currentPos;
        try {
          currentPos = await getCurrentLocation();
          setUserLocation(currentPos);
          console.log('Current location obtained:', currentPos);
        } catch (error) {
          console.error('Failed to get current location:', error);
          // デフォルト位置（東京）
          currentPos = { lat: 35.6762, lng: 139.6503 };
        } finally {
          setIsLocationLoading(false);
        }
        
        // マップを初期化
        const mapInstance = new Map(mapRef.current!, {
          center: currentPos,
          zoom: 15,
          mapTypeId: 'roadmap'
        })
        setMap(mapInstance)

        // 現在地マーカー
        const currentLocationMarker = new Marker({
          position: currentPos,
          map: mapInstance,
          title: 'Your Current Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });
        currentLocationMarkerRef.current = currentLocationMarker;

        // 投稿マーカーを追加する関数
        const addPostMarkers = (mapInstance: google.maps.Map) => {
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
              authorImg.src = post.author.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
              authorImg.alt = post.author.displayName || post.author.username || 'ユーザー'
              authorImg.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; object-fit: cover;'
              authorImg.onerror = () => {
                authorImg.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
              }
              
              const authorName = document.createElement('span')
              authorName.textContent = post.author.displayName || post.author.username || 'ユーザー'
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
        };

        // 投稿マーカーを追加
        addPostMarkers(mapInstance);

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
      } catch (error) {
        console.error('Map initialization failed:', error)
        setIsLocationLoading(false);
      }
    }

    if (mapRef.current) {
      initMap()
    }
  }, [onLocationSelect, onStartPhotoGame])

  // 投稿が更新されたときに地図上のマーカーを更新
  useEffect(() => {
    if (map) {
      // 既存の投稿マーカーをクリア（現在地マーカーは除く）
      // TODO: マーカー管理の改善が必要な場合はここで実装
      
      // 投稿マーカーを再追加
      posts.forEach(post => {
        const marker = new google.maps.Marker({
          position: { lat: post.latitude, lng: post.longitude },
          map: map,
          title: post.content || 'Post'
        })

        // InfoWindowのコンテンツをDOM要素で作成
        const infoWindowContent = document.createElement('div')
        infoWindowContent.style.cssText = 'padding: 8px; max-width: 300px;'
        
        const authorDiv = document.createElement('div')
        authorDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;'
        
        const authorImg = document.createElement('img')
        authorImg.src = post.author.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
        authorImg.alt = post.author.displayName || post.author.username || 'ユーザー'
        authorImg.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; object-fit: cover;'
        authorImg.onerror = () => {
          authorImg.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
        }
        
        const authorName = document.createElement('span')
        authorName.textContent = post.author.displayName || post.author.username || 'ユーザー'
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
          infoWindow.open(map, marker)
        })
      })
    }
  }, [posts, map, onStartPhotoGame])

  return (
    <div className="w-full h-full relative">
      {isLocationLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">現在地を取得中...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}