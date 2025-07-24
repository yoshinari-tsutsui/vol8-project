import SpotifyWebApi from 'spotify-web-api-js';

// Spotify APIクライアントのインスタンス
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let spotifyApi: any = null;

// 認証状態の管理
let isAuthenticated = false;
let accessToken: string | null = null;

// 環境変数をチェックする関数
export const checkSpotifyConfig = (): boolean => {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  return !!(clientId && clientId !== 'your_spotify_client_id_here');
};

// 認証状態をチェックする関数
export const isSpotifyAuthenticated = (): boolean => {
  const isAuth = isAuthenticated && !!accessToken;
  console.log('🎵 Spotify auth check:', {
    isAuthenticated,
    hasAccessToken: !!accessToken,
    result: isAuth
  });
  return isAuth;
};

// アクセストークンを設定
export const setSpotifyAccessToken = (token: string) => {
  if (!spotifyApi) {
    initializeSpotifyApi();
  }
  accessToken = token;
  isAuthenticated = true;
  spotifyApi?.setAccessToken(token);
  
  // トークンをローカルストレージに保存（ブラウザのみ）
  if (typeof window !== 'undefined') {
    localStorage.setItem('spotify_access_token', token);
  }
};

// 保存されたトークンを復元
export const restoreSpotifyToken = () => {
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('spotify_access_token');
    if (savedToken) {
      setSpotifyAccessToken(savedToken);
      return true;
    }
  }
  return false;
};

// 認証を解除
export const clearSpotifyAuth = () => {
  isAuthenticated = false;
  accessToken = null;
  
  if (typeof window !== 'undefined') {
    localStorage.removeItem('spotify_access_token');
  }
  
  if (spotifyApi) {
    spotifyApi.setAccessToken(null);
  }
};

// Spotify APIの初期化
export const initializeSpotifyApi = () => {
  if (typeof window !== 'undefined') {
    try {
      spotifyApi = new SpotifyWebApi();
      console.log('🎵 Spotify API initialized');
      
      // 保存されたトークンがあれば復元
      const restored = restoreSpotifyToken();
      if (restored) {
        console.log('🎵 Spotify token restored from localStorage');
      }
      
      return spotifyApi;
    } catch (error) {
      console.error('🎵 Failed to initialize Spotify API:', error);
      return null;
    }
  }
  return null;
};

// Spotify認証URLを生成
export const getSpotifyAuthUrl = () => {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  
  if (!checkSpotifyConfig()) {
    throw new Error('Spotify Client ID is not configured. Please set NEXT_PUBLIC_SPOTIFY_CLIENT_ID in your environment variables.');
  }
  
  const redirectUri = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';
  const scopes = [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative'
  ];

  const authUrl = `https://accounts.spotify.com/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${encodeURIComponent(scopes.join(' '))}`;

  return authUrl;
};

// 音楽を検索
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const searchTracks = async (query: string, limit: number = 20): Promise<any | null> => {
  try {
    // 環境変数チェック
    if (!checkSpotifyConfig()) {
      console.warn('Spotify API configuration not found. Please set NEXT_PUBLIC_SPOTIFY_CLIENT_ID in .env.local');
      return null;
    }
    
    // 認証チェック
    if (!isSpotifyAuthenticated()) {
      console.warn('Spotify authentication required. Please connect to Spotify first.');
      return null;
    }
    
    if (!spotifyApi) {
      console.warn('Spotify API not initialized');
      return null;
    }
    
    // 実際のAPI呼び出し（アクセストークンが必要）
    const response = await spotifyApi.searchTracks(query, { limit });
    return response;
  } catch (error) {
    // より詳細なエラー情報を提供
    if (error && typeof error === 'object' && 'status' in error) {
      const spotifyError = error as { status: number; message?: string };
      if (spotifyError.status === 401) {
        console.warn('Spotify access token expired. Please reconnect to Spotify.');
        clearSpotifyAuth(); // 期限切れトークンをクリア
      } else if (spotifyError.status === 403) {
        console.warn('Spotify API access forbidden. Check your credentials and permissions.');
      } else {
        console.warn(`Spotify API error (${spotifyError.status}):`, spotifyError.message || 'Unknown error');
      }
    } else {
      console.warn('Spotify search failed. Please check your connection to Spotify.', error);
    }
    return null;
  }
};

// アルバム情報を取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAlbum = async (albumId: string): Promise<any | null> => {
  try {
    if (!checkSpotifyConfig() || !isSpotifyAuthenticated()) {
      return null;
    }
    
    if (!spotifyApi) {
      console.warn('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getAlbum(albumId);
    return response;
  } catch (error) {
    console.warn('Error getting album:', error);
    return null;
  }
};

// トラック情報を取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTrack = async (trackId: string): Promise<any | null> => {
  try {
    if (!checkSpotifyConfig() || !isSpotifyAuthenticated()) {
      return null;
    }
    
    if (!spotifyApi) {
      console.warn('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getTrack(trackId);
    return response;
  } catch (error) {
    console.warn('Error getting track:', error);
    return null;
  }
};

// ユーザーの現在再生中の楽曲を取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentlyPlaying = async (): Promise<any | null> => {
  try {
    if (!checkSpotifyConfig() || !isSpotifyAuthenticated()) {
      return null;
    }
    
    if (!spotifyApi) {
      console.warn('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getMyCurrentPlayingTrack();
    return response;
  } catch (error) {
    console.warn('Error getting currently playing track:', error);
    return null;
  }
};

// 楽曲を再生
export const playTrack = async (trackUri: string, deviceId?: string): Promise<boolean> => {
  try {
    if (!checkSpotifyConfig() || !isSpotifyAuthenticated()) {
      return false;
    }
    
    if (!spotifyApi) {
      console.warn('Spotify API not initialized');
      return false;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const options: any = {
      uris: [trackUri]
    };
    
    if (deviceId) {
      options.device_id = deviceId;
    }
    
    await spotifyApi.play(options);
    return true;
  } catch (error) {
    console.warn('Error playing track:', error);
    return false;
  }
};

// 再生を一時停止
export const pausePlayback = async (): Promise<boolean> => {
  try {
    if (!checkSpotifyConfig() || !isSpotifyAuthenticated()) {
      return false;
    }
    
    if (!spotifyApi) {
      console.warn('Spotify API not initialized');
      return false;
    }
    
    await spotifyApi.pause();
    return true;
  } catch (error) {
    console.warn('Error pausing playback:', error);
    return false;
  }
};

// 利用可能なデバイスを取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDevices = async (): Promise<any | null> => {
  try {
    if (!checkSpotifyConfig() || !isSpotifyAuthenticated()) {
      return null;
    }
    
    if (!spotifyApi) {
      console.warn('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getMyDevices();
    return response;
  } catch (error) {
    console.warn('Error getting devices:', error);
    return null;
  }
};

// Spotify APIが初期化されているかチェック
export const isSpotifyApiReady = (): boolean => {
  return spotifyApi !== null && checkSpotifyConfig() && isSpotifyAuthenticated();
};

// 楽曲情報の型定義
export interface SpotifyTrackInfo {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  preview_url: string | null;
  uri: string;
} 

// 楽曲IDから詳細情報を取得
export const getTrackById = async (trackId: string): Promise<SpotifyTrackInfo | null> => {
  console.log('🎵 getTrackById called with:', trackId);
  
  if (!isSpotifyAuthenticated()) {
    console.warn('🎵 Spotify API is not authenticated');
    return null;
  }
  
  if (!spotifyApi) {
    console.warn('🎵 Spotify API not initialized');
    return null;
  }

  if (!accessToken) {
    console.warn('🎵 No access token available');
    return null;
  }

  try {
    console.log('🎵 Calling Spotify API for track:', trackId);
    const track = await spotifyApi.getTrack(trackId);
    
    if (track) {
      console.log('🎵 Track data received:', {
        id: track.id,
        name: track.name,
        hasAlbum: !!track.album,
        hasImages: !!track.album?.images?.length
      });
      
      return {
        id: track.id,
        name: track.name,
        artists: track.artists.map((artist: any) => ({
          id: artist.id,
          name: artist.name
        })),
        album: {
          id: track.album.id,
          name: track.album.name,
          images: track.album.images
        },
        duration_ms: track.duration_ms,
        external_urls: track.external_urls,
        preview_url: track.preview_url,
        uri: track.uri
      };
    }
    
    console.warn('🎵 No track data received from Spotify API');
    return null;
  } catch (error) {
    console.error('🎵 Failed to get track by ID:', {
      trackId,
      error: error instanceof Error ? error.message : String(error),
      errorType: error?.constructor?.name || 'Unknown'
    });
    
    // ネットワークエラーの場合は特に詳細をログ
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('🎵 Network error detected - check internet connection');
    }
    
    return null;
  }
};

// アルバムIDから詳細情報を取得
export const getAlbumById = async (albumId: string): Promise<any | null> => {
  if (!isSpotifyAuthenticated() || !spotifyApi) {
    console.error('Spotify API is not authenticated');
    return null;
  }

  try {
    const album = await spotifyApi.getAlbum(albumId);
    return album;
  } catch (error) {
    console.error('Failed to get album by ID:', error);
    return null;
  }
}; 