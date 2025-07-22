export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
  posts?: Post[]
  followers?: { follower: UserSummary }[]
  following?: { following: UserSummary }[]
  spotifyConnected?: boolean;
  spotifyAccessToken?: string;
  _count?: {
    posts: number
    followers: number
    following: number
  }
}

export interface UserSummary {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
}

// Spotify楽曲情報の型定義
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

// 投稿データの型定義
export interface PostData {
  content: string;
  imageFile: File | null;
  imageUrl?: string;
  location: Location | null;
  track?: SpotifyTrackInfo | null; // Spotify楽曲情報を追加
}

// 投稿の型定義（データベースからの取得時）
export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  location: Location;
  track?: SpotifyTrackInfo | null; // Spotify楽曲情報を追加
  createdAt: string;
  author?: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}


export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
}

export interface Block {
  id: string
  blockerId: string
  blockedId: string
  createdAt: Date
  blocker?: UserSummary
  blocked?: UserSummary
}

export interface ImageMatchResult {
  similarity: number
  confidence: number
  description: string
}