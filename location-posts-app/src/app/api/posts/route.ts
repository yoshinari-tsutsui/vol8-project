import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Fetching posts...')
    
    // セッションを取得して現在のユーザーIDを確認
    const session = await getServerSession(authOptions)
    let currentUserId: string | null = null
    
    if (session?.user?.email) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      currentUserId = currentUser?.id || null
    }
    
    // ブロックしているユーザーのIDを取得
    let blockedUserIds: string[] = []
    if (currentUserId) {
      const blocks = await prisma.block.findMany({
        where: { blockerId: currentUserId },
        select: { blockedId: true }
      })
      blockedUserIds = blocks.map(block => block.blockedId)
    }
    
    const posts = await prisma.post.findMany({
      where: currentUserId ? {
        authorId: {
          notIn: blockedUserIds
        }
      } : undefined,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 音楽情報をJSONからオブジェクトに変換
    const postsWithMusic = posts.map(post => {
      let track = null;
      const postWithMusicInfo = post as typeof post & { musicInfo: string | null };
      
      if (postWithMusicInfo.musicInfo) {
        try {
          track = JSON.parse(postWithMusicInfo.musicInfo);
          console.log('投稿取得 - 音楽情報解析成功:', {
            postId: post.id,
            trackName: track.name,
            hasPreview: !!track.preview_url,
            albumImages: track.album?.images?.length || 0
          });
        } catch (error) {
          console.warn('Failed to parse music info for post:', post.id, error);
        }
      } else {
        console.log('投稿取得 - 音楽情報なし:', {
          postId: post.id,
          musicUrl: post.musicUrl,
          hasMusicInfo: !!postWithMusicInfo.musicInfo
        });
      }

      return {
        ...post,
        track,
        location: {
          latitude: post.latitude,
          longitude: post.longitude,
          address: post.address
        }
      };
    });

    console.log('Posts fetched:', postsWithMusic.length)
    return NextResponse.json(postsWithMusic)
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { content, imageUrl, musicUrl, musicInfo, latitude, longitude, address, authorId } = body

    console.log('API受信データ:', {
      content: content?.substring(0, 50) + '...',
      hasImage: !!imageUrl,
      hasMusicUrl: !!musicUrl,
      hasMusicInfo: !!musicInfo,
      musicInfoType: typeof musicInfo,
      authorId
    });

    if (!authorId) {
      return NextResponse.json(
        { error: 'Author ID is required' },
        { status: 400 }
      )
    }

    // authorIdがemailの場合はユーザーを検索してIDを取得
    let userId = authorId;
    if (authorId.includes('@')) {
      const user = await prisma.user.findUnique({
        where: { email: authorId },
        select: { id: true }
      });
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      userId = user.id;
    }

    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        musicUrl,
        musicInfo: musicInfo ? JSON.stringify(musicInfo) : null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    })

    // 作成された投稿の音楽情報を解析して返す
    let track = null;
    const postWithMusicInfo = post as typeof post & { musicInfo: string | null };
    if (postWithMusicInfo.musicInfo) {
      try {
        track = JSON.parse(postWithMusicInfo.musicInfo);
      } catch (error) {
        console.warn('Failed to parse music info for created post:', error);
      }
    }

    const postWithTrack = {
      ...post,
      track
    };

    console.log('作成された投稿:', {
      id: postWithTrack.id,
      hasTrack: !!postWithTrack.track,
      trackName: postWithTrack.track?.name,
      hasAlbumImages: !!postWithTrack.track?.album?.images?.length
    });

    return NextResponse.json(postWithTrack)
  } catch (error) {
    console.error('Failed to create post:', error)
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}