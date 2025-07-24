import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const postId = params.id
    const userEmail = session.user.email
    const { content } = await request.json()

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 元の投稿が存在するかチェック
    const originalPost = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!originalPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // 返信を作成
    const reply = await prisma.reply.create({
      data: {
        content: content.trim(),
        authorId: user.id,
        postId: postId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    })

    return NextResponse.json(reply)
  } catch (error) {
    console.error('Reply creation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    
    // 返信を取得
    const replies = await prisma.reply.findMany({
      where: { postId: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    return NextResponse.json(replies)
  } catch (error) {
    console.error('Get replies error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}