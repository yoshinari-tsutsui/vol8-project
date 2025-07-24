import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // musicUrlはあるがmusicInfoがない投稿を取得
    const postsToFix = await prisma.post.findMany({
      where: {
        musicUrl: {
          not: null
        },
        musicInfo: null
      } as any, // 型アサーション
      select: {
        id: true,
        musicUrl: true,
        content: true
      }
    });

    console.log(`修正対象の投稿数: ${postsToFix.length}`);

    const results = [];

    for (const post of postsToFix) {
      try {
        // Spotify URLからtrack IDを抽出
        const trackIdMatch = post.musicUrl?.match(/track\/([a-zA-Z0-9]+)/);
        if (trackIdMatch) {
          const trackId = trackIdMatch[1];
          
          // 基本的な音楽情報を作成（実際のAPI呼び出しは省略）
          const musicInfo = {
            id: trackId,
            name: `Track ${trackId}`,
            artists: [{ id: 'unknown', name: 'Unknown Artist' }],
            album: {
              id: 'unknown',
              name: 'Unknown Album',
              images: []
            },
            duration_ms: 0,
            external_urls: { spotify: post.musicUrl },
            preview_url: null,
            uri: `spotify:track:${trackId}`
          };

          // 投稿を更新
          await prisma.post.update({
            where: { id: post.id },
            data: {
              musicInfo: JSON.stringify(musicInfo)
            } as any // 型アサーション
          });

          results.push({
            id: post.id,
            status: 'fixed',
            trackId
          });

          console.log(`投稿修正完了: ${post.id} -> ${trackId}`);
        }
      } catch (error) {
        console.error(`投稿修正エラー: ${post.id}`, error);
        results.push({
          id: post.id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return NextResponse.json({
      message: `Fixed ${results.filter(r => r.status === 'fixed').length} posts`,
      results
    });

  } catch (error) {
    console.error('Failed to fix music info:', error);
    return NextResponse.json(
      { error: 'Failed to fix music info' },
      { status: 500 }
    );
  }
} 