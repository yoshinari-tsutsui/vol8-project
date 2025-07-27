import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { followerId } = await request.json()
    
    if (!followerId) {
      return NextResponse.json({ error: 'followerId is required' }, { status: 400 })
    }

    if (followerId === id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: id
        }
      }
    })

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
    }

    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId: id
      }
    })

    console.log('✅ Follow created:', {
      followerId: followerId,
      followingId: id,
      meaning: `User ${followerId} is now following User ${id}`
    })

    return NextResponse.json({ success: true, follow })
  } catch (error) {
    console.error('Error creating follow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { followerId } = await request.json()
    
    if (!followerId) {
      return NextResponse.json({ error: 'followerId is required' }, { status: 400 })
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: id
        }
      }
    })

    if (!follow) {
      return NextResponse.json({ error: 'Follow relationship not found' }, { status: 404 })
    }

    await prisma.follow.delete({
      where: {
        id: follow.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting follow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const currentUserId = searchParams.get('currentUserId')
    
    if (!currentUserId) {
      return NextResponse.json({ isFollowing: false })
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: id
        }
      }
    })

    return NextResponse.json({ isFollowing: !!follow })
  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}