"use client"
import { useEffect, useRef, useState } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { getTrackById } from '@/lib/spotify'

/// <reference types="google.maps" />

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

interface GoogleMapProps {
  posts: Post[]
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  onStartPhotoGame?: (postId: string, imageUrl: string) => void
  initialCenter?: {lat: number, lng: number, zoom?: number} | null
}

export default function GoogleMap({ posts, onLocationSelect, onStartPhotoGame, initialCenter }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isLocationLoading, setIsLocationLoading] = useState(true)
  const currentLocationMarkerRef = useRef<google.maps.Marker | null>(null)
  const [trackCache, setTrackCache] = useState<{[key: string]: any}>({})

  // Spotify APIから楽曲情報を取得する関数
  const fetchTrackInfo = async (trackId: string) => {
    if (trackCache[trackId]) {
      return trackCache[trackId];
    }

    try {
      const trackInfo = await getTrackById(trackId);
      if (trackInfo) {
        setTrackCache(prev => ({ ...prev, [trackId]: trackInfo }));
        return trackInfo;
      }
    } catch (error) {
      console.error('Failed to fetch track info:', error);
    }
    return null;
  };

  // 現在地を取得する関数
  const getCurrentLocation = () => {
    return new Promise<{lat: number, lng: number}>((resolve, reject) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported by this browser');
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000, // 15秒に延長
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('Geolocation success:', pos);
          resolve(pos);
        },
        (error) => {
          let errorMessage = 'Unknown geolocation error';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '位置情報の許可が拒否されました。ブラウザの設定で位置情報を許可してください。';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '位置情報が利用できません。';
              break;
            case error.TIMEOUT:
              errorMessage = '位置情報の取得がタイムアウトしました。';
              break;
            default:
              errorMessage = `位置情報エラー: ${error.message}`;
          }
          
          console.warn('Geolocation failed:', {
            code: error.code,
            message: error.message,
            userMessage: errorMessage
          });
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  };

  useEffect(() => {
    const initMap = async () => {
      try {
        // Google Maps APIキーの確認
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key is missing');
          setIsLocationLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places', 'geometry']
        })

        const { Map } = await loader.importLibrary('maps')
        const { Marker } = await loader.importLibrary('marker')

        // 初期中央位置が指定されている場合はそれを使用、そうでなければ現在地を取得
        let currentPos;
        let mapZoom = 15;
        
        if (initialCenter) {
          console.log('📍 初期中央位置が指定されています:', initialCenter);
          currentPos = { lat: initialCenter.lat, lng: initialCenter.lng };
          mapZoom = initialCenter.zoom || 16;
          setIsLocationLoading(false);
        } else {
          try {
            currentPos = await getCurrentLocation();
            console.log('Current location obtained:', currentPos);
          } catch (error) {
            console.warn('Failed to get current location, using default:', error);
            // デフォルト位置（東京）
            currentPos = { lat: 35.6762, lng: 139.6503 };
            
            // ユーザーに通知（オプション）
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                new Notification('位置情報エラー', {
                  body: '現在地の取得に失敗しました。デフォルト位置（東京）を使用します。',
                  icon: '/favicon.ico'
                });
              }
            }
          } finally {
            setIsLocationLoading(false);
          }
        }
        
        // マップを初期化（mapRef.currentが存在することを確認）
        if (!mapRef.current) {
          console.error('Map container not found');
          return;
        }

        // 座標の妥当性をチェック
        if (!currentPos || typeof currentPos.lat !== 'number' || typeof currentPos.lng !== 'number') {
          console.error('Invalid map center coordinates:', currentPos);
          return;
        }

        // ズームレベルの妥当性をチェック
        if (typeof mapZoom !== 'number' || mapZoom < 1 || mapZoom > 22) {
          console.warn('Invalid zoom level, using default:', mapZoom);
          mapZoom = 15;
        }

        const mapInstance = new Map(mapRef.current, {
          center: currentPos,
          zoom: mapZoom,
          mapTypeId: 'roadmap',
          // 追加のマップオプションでエラーを防ぐ
          gestureHandling: 'auto',
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true
        })
        setMap(mapInstance)

        // 現在地マーカー（安全にチェック）
        try {
          const currentLocationMarker = new Marker({
            position: currentPos,
            map: mapInstance,
            title: 'Your Current Location',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#C8956D', // カフェテーマのシナモン色
              fillOpacity: 1,
              strokeColor: '#FEFCF8', // ホワイトフォーム色
              strokeWeight: 3
            }
          });
          currentLocationMarkerRef.current = currentLocationMarker;
        } catch (error) {
          console.error('Failed to create current location marker:', error);
        }

        // 投稿マーカーを追加する関数
        const addPostMarkers = (mapInstance: google.maps.Map) => {
          posts.forEach(post => {
            // 投稿の座標が有効かチェック
            if (typeof post.latitude !== 'number' || typeof post.longitude !== 'number' || 
                isNaN(post.latitude) || isNaN(post.longitude)) {
              console.warn('Invalid post coordinates:', { 
                id: post.id, 
                lat: post.latitude, 
                lng: post.longitude 
              });
              return;
            }

            try {
              const marker = new Marker({
                position: { lat: post.latitude, lng: post.longitude },
                map: mapInstance,
                title: post.content || 'Post',
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#8B6F47', // カフェテーマのコーヒーミディアム色
                  fillOpacity: 0.9,
                  strokeColor: '#4A3B2A', // コーヒーダーク色
                  strokeWeight: 2
                }
              })

              // InfoWindowのコンテンツをDOM要素で作成
              const infoWindowContent = document.createElement('div')
              infoWindowContent.style.cssText = 'padding: 8px; max-width: 300px;'
              
              const authorDiv = document.createElement('div')
              authorDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;'
              
              const authorImg = document.createElement('img')
              authorImg.src = post.author.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
              authorImg.alt = post.author.displayName || post.author.username || 'ユーザー'
              authorImg.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; object-fit: cover; cursor: pointer; transition: opacity 0.2s;'
              authorImg.onerror = () => {
                authorImg.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
              }
              authorImg.addEventListener('click', () => {
                window.location.href = `/profile/${post.author.id}`
              })
              authorImg.addEventListener('mouseenter', () => {
                authorImg.style.opacity = '0.8'
              })
              authorImg.addEventListener('mouseleave', () => {
                authorImg.style.opacity = '1'
              })
              
              const authorName = document.createElement('span')
              authorName.textContent = post.author.displayName || post.author.username || 'ユーザー'
              authorName.style.cssText = 'font-weight: bold; cursor: pointer; color: #3b82f6; text-decoration: none; transition: color 0.2s;'
              authorName.addEventListener('click', () => {
                window.location.href = `/profile/${post.author.id}`
              })
              authorName.addEventListener('mouseenter', () => {
                authorName.style.color = '#1d4ed8'
                authorName.style.textDecoration = 'underline'
              })
              authorName.addEventListener('mouseleave', () => {
                authorName.style.color = '#3b82f6'
                authorName.style.textDecoration = 'none'
              })
              
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
              if (post.musicUrl || post.track) {
                const musicDiv = document.createElement('div')
                musicDiv.style.cssText = 'margin-bottom: 8px;'
                
                // 音楽情報のヘッダー
                const musicHeader = document.createElement('div')
                musicHeader.style.cssText = 'display: flex; align-items: center; margin-bottom: 6px;'
                
                const musicIcon = document.createElement('span')
                musicIcon.textContent = '🎵'
                musicIcon.style.cssText = 'margin-right: 6px; font-size: 16px;'
                musicHeader.appendChild(musicIcon)
                
                const musicLabel = document.createElement('span')
                musicLabel.textContent = '音楽'
                musicLabel.style.cssText = 'font-weight: bold; font-size: 14px; color: #374151;'
                musicHeader.appendChild(musicLabel)
                
                musicDiv.appendChild(musicHeader)
                
                // 音楽情報の詳細
                if (post.track) {
                  const trackInfoDiv = document.createElement('div')
                  trackInfoDiv.style.cssText = 'display: flex; align-items: center; background: #f3f4f6; padding: 8px; border-radius: 6px;'
                  
                  // 楽曲IDがある場合はSpotify APIから情報を取得
                  const loadTrackInfo = async () => {
                    if (post.track?.id) {
                      const freshTrackInfo = await fetchTrackInfo(post.track.id);
                      if (freshTrackInfo && freshTrackInfo.album?.images?.length > 0) {
                        console.log('🎵 Spotify APIからアルバムアート取得:', {
                          trackName: freshTrackInfo.name,
                          albumName: freshTrackInfo.album.name,
                          imageUrl: freshTrackInfo.album.images[0].url
                        });
                        
                        // アルバムアートを更新
                        const albumArtContainer = trackInfoDiv.querySelector('.album-art-container') as HTMLElement;
                        if (albumArtContainer) {
                          albumArtContainer.style.backgroundImage = `url(${freshTrackInfo.album.images[0].url})`;
                        }
                      }
                    }
                  };
                  
                  // アルバムアート
                  if (post.track?.album?.images && post.track.album.images.length > 0) {
                    // より確実な画像表示のため、imgタグの代わりにdivで背景画像を使用
                    const albumArtContainer = document.createElement('div')
                    albumArtContainer.className = 'album-art-container'
                    albumArtContainer.style.cssText = 'width: 40px; height: 40px; border-radius: 4px; margin-right: 8px; border: 1px solid #e5e7eb; background-size: cover; background-position: center; background-repeat: no-repeat;'
                    
                    // 画像をプリロードしてから背景に設定
                    const img = new Image()
                    img.crossOrigin = 'anonymous'
                    img.onload = () => {
                      console.log('🎵 アルバムアート読み込み成功:', post.track?.album?.images?.[0]?.url);
                      albumArtContainer.style.backgroundImage = `url(${post.track?.album?.images?.[0]?.url})`
                    }
                    img.onerror = () => {
                      console.error('🎵 アルバムアート読み込みエラー:', post.track?.album?.images?.[0]?.url);
                      // エラー時にSpotify APIから再取得を試行
                      loadTrackInfo();
                      // フォールバックアイコンを表示
                      albumArtContainer.style.background = '#f3f4f6'
                      albumArtContainer.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 16px;">🎵</div>'
                    }
                    img.src = post.track?.album?.images?.[0]?.url || ''
                    
                    trackInfoDiv.appendChild(albumArtContainer)
                  } else {
                    console.log('🎵 アルバムアートなし、Spotify APIから取得を試行:', {
                      trackName: post.track?.name,
                      trackId: post.track?.id
                    });
                    
                    // フォールバックアイコンを表示
                    const fallbackIcon = document.createElement('div')
                    fallbackIcon.style.cssText = 'width: 40px; height: 40px; border-radius: 4px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; margin-right: 8px; border: 1px solid #e5e7eb;'
                    fallbackIcon.innerHTML = '🎵'
                    trackInfoDiv.appendChild(fallbackIcon)
                    
                    // Spotify APIから情報を取得
                    loadTrackInfo();
                  }
                  
                  // 楽曲情報
                  const trackDetailsDiv = document.createElement('div')
                  trackDetailsDiv.style.cssText = 'flex: 1; min-width: 0;'
                  
                  const trackName = document.createElement('div')
                  trackName.textContent = post.track.name
                  trackName.style.cssText = 'font-weight: 600; font-size: 13px; color: #111827; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
                  trackDetailsDiv.appendChild(trackName)
                  
                  const artistName = document.createElement('div')
                  artistName.textContent = post.track.artists.map(artist => artist.name).join(', ')
                  artistName.style.cssText = 'font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
                  trackDetailsDiv.appendChild(artistName)
                  
                  const albumName = document.createElement('div')
                  albumName.textContent = post.track.album.name
                  albumName.style.cssText = 'font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
                  trackDetailsDiv.appendChild(albumName)
                  
                  trackInfoDiv.appendChild(trackDetailsDiv)
                  
                  // Spotifyリンク
                  if (post.track.external_urls?.spotify) {
                    const spotifyLink = document.createElement('a')
                    spotifyLink.href = post.track.external_urls.spotify
                    spotifyLink.target = '_blank'
                    spotifyLink.style.cssText = 'display: inline-block; margin-left: 8px;'
                    
                    const spotifyIcon = document.createElement('span')
                    spotifyIcon.textContent = '🎧'
                    spotifyIcon.style.cssText = 'font-size: 16px; cursor: pointer;'
                    spotifyLink.appendChild(spotifyIcon)
                    
                    trackInfoDiv.appendChild(spotifyLink)
                  }
                  
                  musicDiv.appendChild(trackInfoDiv)
                } else if (post.musicUrl) {
                  // 古い形式の音楽URLがある場合
                  const musicLink = document.createElement('a')
                  musicLink.href = post.musicUrl
                  musicLink.target = '_blank'
                  musicLink.textContent = 'Spotifyで再生'
                  musicLink.style.cssText = 'display: inline-block; background: #1db954; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;'
                  musicDiv.appendChild(musicLink)
                }
                
                infoWindowContent.appendChild(musicDiv)
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
            } catch (error) {
              console.error('Failed to create post marker:', error, { postId: post.id });
            }
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
  }, [posts, onLocationSelect, onStartPhotoGame, initialCenter])

  // 投稿が更新されたときに地図上のマーカーを更新
  useEffect(() => {
    if (map) {
      // 既存の投稿マーカーをクリア（現在地マーカーは除く）
      // TODO: マーカー管理の改善が必要な場合はここで実装
      
      // 投稿マーカーを再追加
      posts.forEach(post => {
        // 投稿の座標が有効かチェック
        if (typeof post.latitude !== 'number' || typeof post.longitude !== 'number' || 
            isNaN(post.latitude) || isNaN(post.longitude)) {
          console.warn('Invalid post coordinates in update:', { 
            id: post.id, 
            lat: post.latitude, 
            lng: post.longitude 
          });
          return;
        }

        try {
          const marker = new google.maps.Marker({
            position: { lat: post.latitude, lng: post.longitude },
            map: map,
            title: post.content || 'Post',
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#8B6F47', // カフェテーマのコーヒーミディアム色
              fillOpacity: 0.9,
              strokeColor: '#4A3B2A', // コーヒーダーク色
              strokeWeight: 2
            }
          })

        // InfoWindowのコンテンツをDOM要素で作成
        const infoWindowContent = document.createElement('div')
        infoWindowContent.style.cssText = 'padding: 8px; max-width: 300px;'
        
        const authorDiv = document.createElement('div')
        authorDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;'
        
        const authorImg = document.createElement('img')
        authorImg.src = post.author.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
        authorImg.alt = post.author.displayName || post.author.username || 'ユーザー'
        authorImg.style.cssText = 'width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; object-fit: cover; cursor: pointer; transition: opacity 0.2s;'
        authorImg.onerror = () => {
          authorImg.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
        }
        authorImg.addEventListener('click', () => {
          window.location.href = `/profile/${post.author.id}`
        })
        authorImg.addEventListener('mouseenter', () => {
          authorImg.style.opacity = '0.8'
        })
        authorImg.addEventListener('mouseleave', () => {
          authorImg.style.opacity = '1'
        })
        
        const authorName = document.createElement('span')
        authorName.textContent = post.author.displayName || post.author.username || 'ユーザー'
        authorName.style.cssText = 'font-weight: bold; cursor: pointer; color: #3b82f6; text-decoration: none; transition: color 0.2s;'
        authorName.addEventListener('click', () => {
          window.location.href = `/profile/${post.author.id}`
        })
        authorName.addEventListener('mouseenter', () => {
          authorName.style.color = '#1d4ed8'
          authorName.style.textDecoration = 'underline'
        })
        authorName.addEventListener('mouseleave', () => {
          authorName.style.color = '#3b82f6'
          authorName.style.textDecoration = 'none'
        })
        
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
        if (post.musicUrl || post.track) {
          const musicDiv = document.createElement('div')
          musicDiv.style.cssText = 'margin-bottom: 8px;'
          
          // 音楽情報のヘッダー
          const musicHeader = document.createElement('div')
          musicHeader.style.cssText = 'display: flex; align-items: center; margin-bottom: 6px;'
          
          const musicIcon = document.createElement('span')
          musicIcon.textContent = '🎵'
          musicIcon.style.cssText = 'margin-right: 6px; font-size: 16px;'
          musicHeader.appendChild(musicIcon)
          
          const musicLabel = document.createElement('span')
          musicLabel.textContent = '音楽'
          musicLabel.style.cssText = 'font-weight: bold; font-size: 14px; color: #374151;'
          musicHeader.appendChild(musicLabel)
          
          musicDiv.appendChild(musicHeader)
          
          // 音楽情報の詳細
          if (post.track) {
            const trackInfoDiv = document.createElement('div')
            trackInfoDiv.style.cssText = 'display: flex; align-items: center; background: #f3f4f6; padding: 8px; border-radius: 6px;'
            
            // 楽曲IDがある場合はSpotify APIから情報を取得
            const loadTrackInfo = async () => {
              if (post.track?.id) {
                const freshTrackInfo = await fetchTrackInfo(post.track.id);
                if (freshTrackInfo && freshTrackInfo.album?.images?.length > 0) {
                  console.log('🎵 Spotify APIからアルバムアート取得:', {
                    trackName: freshTrackInfo.name,
                    albumName: freshTrackInfo.album.name,
                    imageUrl: freshTrackInfo.album.images[0].url
                  });
                  
                  // アルバムアートを更新
                  const albumArtContainer = trackInfoDiv.querySelector('.album-art-container') as HTMLElement;
                  if (albumArtContainer) {
                    albumArtContainer.style.backgroundImage = `url(${freshTrackInfo.album.images[0].url})`;
                  }
                }
              }
            };
            
            // アルバムアート
            if (post.track?.album?.images && post.track.album.images.length > 0) {
              // より確実な画像表示のため、imgタグの代わりにdivで背景画像を使用
              const albumArtContainer = document.createElement('div')
              albumArtContainer.className = 'album-art-container'
              albumArtContainer.style.cssText = 'width: 40px; height: 40px; border-radius: 4px; margin-right: 8px; border: 1px solid #e5e7eb; background-size: cover; background-position: center; background-repeat: no-repeat;'
              
              // 画像をプリロードしてから背景に設定
              const img = new Image()
              img.crossOrigin = 'anonymous'
              img.onload = () => {
                console.log('🎵 アルバムアート読み込み成功:', post.track?.album?.images?.[0]?.url);
                albumArtContainer.style.backgroundImage = `url(${post.track?.album?.images?.[0]?.url})`
              }
              img.onerror = () => {
                console.error('🎵 アルバムアート読み込みエラー:', post.track?.album?.images?.[0]?.url);
                // エラー時にSpotify APIから再取得を試行
                loadTrackInfo();
                // フォールバックアイコンを表示
                albumArtContainer.style.background = '#f3f4f6'
                albumArtContainer.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 16px;">🎵</div>'
              }
              img.src = post.track?.album?.images?.[0]?.url || ''
              
              trackInfoDiv.appendChild(albumArtContainer)
            } else {
              console.log('🎵 アルバムアートなし、Spotify APIから取得を試行:', {
                trackName: post.track?.name,
                trackId: post.track?.id
              });
              
              // フォールバックアイコンを表示
              const fallbackIcon = document.createElement('div')
              fallbackIcon.style.cssText = 'width: 40px; height: 40px; border-radius: 4px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; margin-right: 8px; border: 1px solid #e5e7eb;'
              fallbackIcon.innerHTML = '🎵'
              trackInfoDiv.appendChild(fallbackIcon)
              
              // Spotify APIから情報を取得
              loadTrackInfo();
            }
            
            // 楽曲情報
            const trackDetailsDiv = document.createElement('div')
            trackDetailsDiv.style.cssText = 'flex: 1; min-width: 0;'
            
            const trackName = document.createElement('div')
            trackName.textContent = post.track.name
            trackName.style.cssText = 'font-weight: 600; font-size: 13px; color: #111827; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
            trackDetailsDiv.appendChild(trackName)
            
            const artistName = document.createElement('div')
            artistName.textContent = post.track.artists.map(artist => artist.name).join(', ')
            artistName.style.cssText = 'font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
            trackDetailsDiv.appendChild(artistName)
            
            const albumName = document.createElement('div')
            albumName.textContent = post.track.album.name
            albumName.style.cssText = 'font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
            trackDetailsDiv.appendChild(albumName)
            
            trackInfoDiv.appendChild(trackDetailsDiv)
            
            // Spotifyリンク
            if (post.track.external_urls?.spotify) {
              const spotifyLink = document.createElement('a')
              spotifyLink.href = post.track.external_urls.spotify
              spotifyLink.target = '_blank'
              spotifyLink.style.cssText = 'display: inline-block; margin-left: 8px;'
              
              const spotifyIcon = document.createElement('span')
              spotifyIcon.textContent = '🎧'
              spotifyIcon.style.cssText = 'font-size: 16px; cursor: pointer;'
              spotifyLink.appendChild(spotifyIcon)
              
              trackInfoDiv.appendChild(spotifyLink)
            }
            
            musicDiv.appendChild(trackInfoDiv)
          } else if (post.musicUrl) {
            // 古い形式の音楽URLがある場合
            const musicLink = document.createElement('a')
            musicLink.href = post.musicUrl
            musicLink.target = '_blank'
            musicLink.textContent = 'Spotifyで再生'
            musicLink.style.cssText = 'display: inline-block; background: #1db954; color: white; padding: 6px 12px; border-radius: 4px; text-decoration: none; font-size: 12px;'
            musicDiv.appendChild(musicLink)
          }
          
          infoWindowContent.appendChild(musicDiv)
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
        } catch (error) {
          console.error('Failed to create post marker in update:', error, { postId: post.id });
        }
      })
    }
  }, [posts, map, onStartPhotoGame])

  return (
    <div className="w-full h-full relative">
      {isLocationLoading && (
        <div className="absolute inset-0 bg-cream bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cinnamon mx-auto mb-4"></div>
            <p className="text-coffee-medium">現在地を取得中...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}