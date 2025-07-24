import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ liked: false })
    }

    const postId = params.id
    const userEmail = session.user.email

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      return NextResponse.json({ liked: false })
    }

    // いいねの状態をチェック
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId
        }
      }
    })

    return NextResponse.json({ liked: !!existingLike })
  } catch (error) {
    console.error('Check like status error:', error)
    return NextResponse.json({ liked: false })
  }
}