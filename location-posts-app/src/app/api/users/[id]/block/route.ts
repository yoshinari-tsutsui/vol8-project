import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { blockerId } = await request.json()
    
    if (!blockerId) {
      return NextResponse.json({ error: 'blockerId is required' }, { status: 400 })
    }

    if (blockerId === params.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })
    }

    // 既にブロックしているかチェック
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: params.id
        }
      }
    })

    if (existingBlock) {
      return NextResponse.json({ error: 'Already blocking this user' }, { status: 400 })
    }

    // ブロック時は相互フォローを解除
    await prisma.$transaction(async (tx) => {
      // ブロック作成
      await tx.block.create({
        data: {
          blockerId,
          blockedId: params.id
        }
      })

      // 相互フォロー関係を削除
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: params.id },
            { followerId: params.id, followingId: blockerId }
          ]
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { blockerId } = await request.json()
    
    if (!blockerId) {
      return NextResponse.json({ error: 'blockerId is required' }, { status: 400 })
    }

    const block = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: params.id
        }
      }
    })

    if (!block) {
      return NextResponse.json({ error: 'Block relationship not found' }, { status: 404 })
    }

    await prisma.block.delete({
      where: {
        id: block.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const currentUserId = searchParams.get('currentUserId')
    
    if (!currentUserId) {
      return NextResponse.json({ isBlocking: false, isBlockedBy: false })
    }

    // ブロック状態をチェック（相互に確認）
    const [blocking, blockedBy] = await Promise.all([
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: currentUserId,
            blockedId: params.id
          }
        }
      }),
      prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: params.id,
            blockedId: currentUserId
          }
        }
      })
    ])

    return NextResponse.json({ 
      isBlocking: !!blocking,
      isBlockedBy: !!blockedBy
    })
  } catch (error) {
    console.error('Error checking block status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}