import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'localhost', 
      'example.com', 
      'images.unsplash.com', 
      'i.scdn.co', 
      'lh3.googleusercontent.com',
      'mosaic.scdn.co',
      'wrapped-images.spotifycdn.com',
      'seeded-session-images.scdn.co',
      'thisis-images.spotifycdn.com',
      'image-cdn-fa.spotifycdn.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.scdn.co',
      },
      {
        protocol: 'https',
        hostname: '*.spotifycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  env: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
