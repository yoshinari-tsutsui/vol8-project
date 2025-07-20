import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ログインユーザーのみ作成
  const user = await prisma.user.upsert({
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
  })

  console.log('Created user:', user.username)

  // サンプル投稿を作成（user1のみ）
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
        content: '桜の季節がやってきました！上野公園での花見は最高です。',
        imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=400&h=300&fit=crop',
        latitude: 35.7148,
        longitude: 139.7739,
        address: '東京都台東区上野公園',
        authorId: 'user1'
      }
    }),
    prisma.post.upsert({
      where: { id: 'post3' },
      update: {},
      create: {
        id: 'post3',
        content: '新宿のカフェでお気に入りの音楽を聴きながらリラックス中☕',
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
        musicUrl: 'https://example.com/sample-track',
        latitude: 35.6762,
        longitude: 139.6503,
        address: '東京都新宿区新宿',
        authorId: 'user1'
      }
    })
  ])

  console.log('Created posts:', posts.map(p => p.id))

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