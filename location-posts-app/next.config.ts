import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['localhost', 'example.com', 'images.unsplash.com', 'lh3.googleusercontent.com'],
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
  // HTTPS設定（開発環境）
  // experimental: {
  //   https: process.env.NODE_ENV === 'development',
  // },
};

export default nextConfig;
