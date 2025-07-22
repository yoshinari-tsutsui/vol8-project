import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = request.nextUrl.origin;

  // エラーの場合
  if (error) {
    console.error('Spotify auth error:', error);
    return NextResponse.redirect(`${baseUrl}/map?error=spotify_auth_failed`);
  }

  // 認証コードがない場合
  if (!code) {
    console.error('No authorization code received');
    return NextResponse.redirect(`${baseUrl}/map?error=no_code`);
  }

  try {
    // アクセストークンを取得
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || `${baseUrl}/api/auth/spotify/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Token request failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    // 成功: アクセストークンをクエリパラメータとして返す
    // 実際のアプリではより安全な方法を使用すべきですが、デモ用としてシンプルに実装
    return NextResponse.redirect(`${baseUrl}/map?spotify_token=${accessToken}&success=spotify_connected`);

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.redirect(`${baseUrl}/map?error=token_exchange_failed`);
  }
} 