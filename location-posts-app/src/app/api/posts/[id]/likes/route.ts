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

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 既存のいいねをチェック
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId
        }
      }
    })

    if (existingLike) {
      // いいねを削除
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: user.id,
            postId: postId
          }
        }
      })
      
      return NextResponse.json({ liked: false })
    } else {
      // いいねを追加
      await prisma.like.create({
        data: {
          userId: user.id,
          postId: postId
        }
      })
      
      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    
    // いいね数を取得
    const likeCount = await prisma.like.count({
      where: { postId: postId }
    })
    
    return NextResponse.json({ count: likeCount })
  } catch (error) {
    console.error('Get likes error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}