import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const posts = await prisma.post.findMany({
      where: { authorId: id },
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    const totalPosts = await prisma.post.count({
      where: { authorId: id }
    })

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total: totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching user posts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}