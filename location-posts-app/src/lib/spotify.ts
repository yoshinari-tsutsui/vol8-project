import SpotifyWebApi from 'spotify-web-api-js';

// Spotify APIクライアントのインスタンス
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let spotifyApi: any = null;

// Spotify APIの初期化
export const initializeSpotifyApi = () => {
  if (typeof window !== 'undefined') {
    spotifyApi = new SpotifyWebApi();
  }
  return spotifyApi;
};

// アクセストークンを設定
export const setSpotifyAccessToken = (token: string) => {
  if (!spotifyApi) {
    initializeSpotifyApi();
  }
  spotifyApi?.setAccessToken(token);
};

// Spotify認証URLを生成
export const getSpotifyAuthUrl = () => {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
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
    if (!spotifyApi) {
      console.error('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.searchTracks(query, { limit });
    return response;
  } catch (error) {
    console.error('Error searching tracks:', error);
    return null;
  }
};

// アルバム情報を取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAlbum = async (albumId: string): Promise<any | null> => {
  try {
    if (!spotifyApi) {
      console.error('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getAlbum(albumId);
    return response;
  } catch (error) {
    console.error('Error getting album:', error);
    return null;
  }
};

// トラック情報を取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTrack = async (trackId: string): Promise<any | null> => {
  try {
    if (!spotifyApi) {
      console.error('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getTrack(trackId);
    return response;
  } catch (error) {
    console.error('Error getting track:', error);
    return null;
  }
};

// ユーザーの現在再生中の楽曲を取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getCurrentlyPlaying = async (): Promise<any | null> => {
  try {
    if (!spotifyApi) {
      console.error('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getMyCurrentPlayingTrack();
    return response;
  } catch (error) {
    console.error('Error getting currently playing track:', error);
    return null;
  }
};

// 楽曲を再生
export const playTrack = async (trackUri: string, deviceId?: string): Promise<boolean> => {
  try {
    if (!spotifyApi) {
      console.error('Spotify API not initialized');
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
    console.error('Error playing track:', error);
    return false;
  }
};

// 再生を一時停止
export const pausePlayback = async (): Promise<boolean> => {
  try {
    if (!spotifyApi) {
      console.error('Spotify API not initialized');
      return false;
    }
    
    await spotifyApi.pause();
    return true;
  } catch (error) {
    console.error('Error pausing playback:', error);
    return false;
  }
};

// 利用可能なデバイスを取得
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDevices = async (): Promise<any | null> => {
  try {
    if (!spotifyApi) {
      console.error('Spotify API not initialized');
      return null;
    }
    
    const response = await spotifyApi.getMyDevices();
    return response;
  } catch (error) {
    console.error('Error getting devices:', error);
    return null;
  }
};

// Spotify APIが初期化されているかチェック
export const isSpotifyApiReady = (): boolean => {
  return spotifyApi !== null;
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