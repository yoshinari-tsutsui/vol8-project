import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const blocks = await prisma.block.findMany({
      where: { blockerId: id },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(blocks)
  } catch (error) {
    console.error('Error fetching blocked users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}