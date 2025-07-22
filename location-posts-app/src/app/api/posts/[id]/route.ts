import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    const currentUserId = 'user1' // TODO: 実際の認証システムから取得

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