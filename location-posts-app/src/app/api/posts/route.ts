import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(posts)
  } catch (error) {
    console.error('Failed to fetch posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
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