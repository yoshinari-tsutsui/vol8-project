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

export interface Post {
  id: string
  content?: string
  imageUrl?: string
  musicUrl?: string
  latitude: number
  longitude: number
  address?: string
  createdAt: Date
  updatedAt: Date
  authorId: string
  author: User
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

export interface Location {
  latitude: number
  longitude: number
  address?: string
}

export interface SpotifyTrack {
  id: string
  name: string
  artist: string
  preview_url?: string
  external_urls: {
    spotify: string
  }
}

export interface ImageMatchResult {
  similarity: number
  confidence: number
  description: string
}