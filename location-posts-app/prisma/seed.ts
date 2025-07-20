import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // テストユーザーを作成
  const users = await Promise.all([
    prisma.user.upsert({
      where: { id: 'user1' },
      update: {},
      create: {
        id: 'user1',
        email: 'alice@example.com',
        username: 'alice',
        displayName: 'Alice Johnson',
        bio: '写真と音楽が好きです。東京在住のクリエイターです。',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.upsert({
      where: { id: 'user2' },
      update: {},
      create: {
        id: 'user2',
        email: 'bob@example.com',
        username: 'bob_photographer',
        displayName: 'Bob Wilson',
        bio: 'Travel photographer exploring Japan. Love street photography and local culture.',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.upsert({
      where: { id: 'user3' },
      update: {},
      create: {
        id: 'user3',
        email: 'charlie@example.com',
        username: 'charlie_music',
        displayName: 'Charlie Brown',
        bio: 'ミュージシャン兼DJ。渋谷でよく演奏しています。',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.upsert({
      where: { id: 'user4' },
      update: {},
      create: {
        id: 'user4',
        email: 'diana@example.com',
        username: 'diana_artist',
        displayName: 'Diana Kim',
        bio: 'Digital artist and designer. Creating art that connects people and places.',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
      }
    }),
    prisma.user.upsert({
      where: { id: 'user5' },
      update: {},
      create: {
        id: 'user5',
        email: 'eve@example.com',
        username: 'eve_foodie',
        displayName: 'Eve Martinez',
        bio: 'Food blogger and chef. Discovering amazing local restaurants in Tokyo.',
        avatarUrl: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=150&h=150&fit=crop&crop=face'
      }
    })
  ])

  console.log('Created users:', users.map(u => u.username))

  // サンプル投稿を作成
  const posts = await Promise.all([
    prisma.post.upsert({
      where: { id: 'post1' },
      update: {},
      create: {
        id: 'post1',
        content: '渋谷の夕日が美しい！今日は素敵な写真が撮れました。',
        imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
        latitude: 35.6598,
        longitude: 139.7006,
        address: '東京都渋谷区渋谷',
        authorId: 'user1'
      }
    }),
    prisma.post.upsert({
      where: { id: 'post2' },
      update: {},
      create: {
        id: 'post2',
        content: 'Amazing street art in Harajuku! The creativity here never stops inspiring me.',
        imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
        latitude: 35.6702,
        longitude: 139.7026,
        address: '東京都渋谷区神宮前',
        authorId: 'user2'
      }
    }),
    prisma.post.upsert({
      where: { id: 'post3' },
      update: {},
      create: {
        id: 'post3',
        content: '今夜のライブの準備中！新曲も披露する予定です。',
        imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
        musicUrl: 'https://example.com/sample-track',
        latitude: 35.6584,
        longitude: 139.7016,
        address: '東京都渋谷区道玄坂',
        authorId: 'user3'
      }
    }),
    prisma.post.upsert({
      where: { id: 'post4' },
      update: {},
      create: {
        id: 'post4',
        content: 'Working on a new digital art piece inspired by Tokyo cityscapes.',
        imageUrl: 'https://images.unsplash.com/photo-1561998338-13ad7883b20f?w=400&h=300&fit=crop',
        latitude: 35.6762,
        longitude: 139.6503,
        address: '東京都新宿区新宿',
        authorId: 'user4'
      }
    }),
    prisma.post.upsert({
      where: { id: 'post5' },
      update: {},
      create: {
        id: 'post5',
        content: 'この小さなラーメン店の味は本当に絶品！隠れた名店を発見しました。',
        imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop',
        latitude: 35.6895,
        longitude: 139.6917,
        address: '東京都新宿区歌舞伎町',
        authorId: 'user5'
      }
    }),
    prisma.post.upsert({
      where: { id: 'post6' },
      update: {},
      create: {
        id: 'post6',
        content: '桜の季節がやってきました！上野公園での花見は最高です。',
        imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=300&fit=crop',
        latitude: 35.7148,
        longitude: 139.7739,
        address: '東京都台東区上野公園',
        authorId: 'user1'
      }
    })
  ])

  console.log('Created posts:', posts.map(p => p.id))

  // フォロー関係を作成
  const follows = await Promise.all([
    prisma.follow.upsert({
      where: { 
        followerId_followingId: {
          followerId: 'user1',
          followingId: 'user2'
        }
      },
      update: {},
      create: {
        followerId: 'user1',
        followingId: 'user2'
      }
    }),
    prisma.follow.upsert({
      where: { 
        followerId_followingId: {
          followerId: 'user1',
          followingId: 'user3'
        }
      },
      update: {},
      create: {
        followerId: 'user1',
        followingId: 'user3'
      }
    }),
    prisma.follow.upsert({
      where: { 
        followerId_followingId: {
          followerId: 'user2',
          followingId: 'user1'
        }
      },
      update: {},
      create: {
        followerId: 'user2',
        followingId: 'user1'
      }
    }),
    prisma.follow.upsert({
      where: { 
        followerId_followingId: {
          followerId: 'user3',
          followingId: 'user1'
        }
      },
      update: {},
      create: {
        followerId: 'user3',
        followingId: 'user1'
      }
    }),
    prisma.follow.upsert({
      where: { 
        followerId_followingId: {
          followerId: 'user4',
          followingId: 'user1'
        }
      },
      update: {},
      create: {
        followerId: 'user4',
        followingId: 'user1'
      }
    }),
    prisma.follow.upsert({
      where: { 
        followerId_followingId: {
          followerId: 'user2',
          followingId: 'user3'
        }
      },
      update: {},
      create: {
        followerId: 'user2',
        followingId: 'user3'
      }
    })
  ])

  console.log('Created follows:', follows.length)

  console.log('✅ Seed data created successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })