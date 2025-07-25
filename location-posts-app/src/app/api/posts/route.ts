import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('Fetching posts...')
    
    // セッションを取得して現在のユーザーIDを確認
    const session = await getServerSession(authOptions)
    let currentUserId = null
    
    if (session?.user?.email) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      currentUserId = currentUser?.id
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

    console.log('Posts fetched:', posts.length)
    return NextResponse.json(posts)
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
    const { content, imageUrl, musicUrl, latitude, longitude, address, authorId } = body

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
        }
      }
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error('Failed to create post:', error)
    return NextResponse.json(
      { error: 'Failed to create post', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}