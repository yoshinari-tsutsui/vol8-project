import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params
    
    // セッションからユーザー情報を取得
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
    }

    // セッションのemailからユーザーIDを取得
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    const currentUserId = user.id

    // 投稿が存在し、現在のユーザーの投稿であることを確認
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true }
    })

    if (!post) {
      return NextResponse.json({ error: '投稿が見つかりません' }, { status: 404 })
    }

    if (post.authorId !== currentUserId) {
      return NextResponse.json({ error: '他のユーザーの投稿は削除できません' }, { status: 403 })
    }

    // 投稿を削除
    await prisma.post.delete({
      where: { id: postId }
    })

    return NextResponse.json({ message: '投稿が削除されました' }, { status: 200 })

  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}