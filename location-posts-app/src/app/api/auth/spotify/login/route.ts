import { NextRequest, NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/lib/spotify';

export async function GET(request: NextRequest) {
  try {
    // Spotify認証URLを生成
    const authUrl = getSpotifyAuthUrl();
    
    // Spotify認証ページにリダイレクト
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Spotify login error:', error);
    
    // エラーページにリダイレクト
    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/map?error=spotify_config`);
  }
} 