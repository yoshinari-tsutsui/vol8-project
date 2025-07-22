import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
<<<<<<< HEAD
  // テストユーザーを作成
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'テストユーザー',
      username: 'testuser',
      displayName: 'テスト太郎',
      bio: 'テスト用のユーザーアカウントです',
    },
  })

  // 東京都内の有名な場所にテスト投稿を作成
  const testPosts = [
    {
      content: '東京タワーからの眺めが最高です！🗼',
      imageUrl: 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800',
      latitude: 35.6586,
      longitude: 139.7454,
      address: '東京都港区芝公園4-2-8',
      authorId: testUser.id,
    },
    {
      content: '渋谷スクランブル交差点で人の波に圧倒されました',
      imageUrl: 'https://images.unsplash.com/photo-1542931287-023b922fa89b?w=800',
      latitude: 35.6595,
      longitude: 139.7006,
      address: '東京都渋谷区道玄坂2-1',
      authorId: testUser.id,
    },
    {
      content: '浅草寺でお参りしてきました🙏',
      imageUrl: 'https://images.unsplash.com/photo-1554400876-e81bf4ba1cd3?w=800',
      latitude: 35.7148,
      longitude: 139.7967,
      address: '東京都台東区浅草2-3-1',
      authorId: testUser.id,
    },
    {
      content: '新宿御苑の桜が綺麗でした🌸',
      imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800',
      latitude: 35.6851,
      longitude: 139.7104,
      address: '東京都新宿区内藤町11',
      authorId: testUser.id,
    },
    {
      content: 'お台場の夜景がロマンチック✨',
      imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
      latitude: 35.6269,
      longitude: 139.7734,
      address: '東京都港区台場1-4',
      authorId: testUser.id,
    },
    {
      content: '秋葉原で最新ガジェットをチェック！',
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
      latitude: 35.6980,
      longitude: 139.7731,
      address: '東京都千代田区外神田1-1',
      authorId: testUser.id,
    },
    {
      content: '上野動物園でパンダに会えました🐼',
      imageUrl: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800',
      latitude: 35.7167,
      longitude: 139.7714,
      address: '東京都台東区上野公園9-83',
      authorId: testUser.id,
    },
    {
      content: '築地市場で新鮮なお寿司をいただきました🍣',
      imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800',
      latitude: 35.6654,
      longitude: 139.7707,
      address: '東京都中央区築地5-2-1',
      authorId: testUser.id,
    },
    {
      content: '代々木公園でピクニック中🧺',
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      latitude: 35.6719,
      longitude: 139.6960,
      address: '東京都渋谷区代々木神園町2-1',
      authorId: testUser.id,
    },
    {
      content: '銀座でショッピング中✨',
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      latitude: 35.6762,
      longitude: 139.7653,
      address: '東京都中央区銀座4-6-16',
      authorId: testUser.id,
    }
  ]

  // 投稿を一つずつ作成
  for (const post of testPosts) {
    await prisma.post.create({
      data: post,
    })
  }

  console.log('テストデータの作成が完了しました！')
  console.log(`ユーザー: ${testUser.name} (${testUser.email})`)
  console.log(`投稿数: ${testPosts.length}件`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
=======
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
>>>>>>> origin/profile
  })