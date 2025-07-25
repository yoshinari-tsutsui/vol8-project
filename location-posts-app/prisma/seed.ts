import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // テストユーザーを作成
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'テストユーザー',
      username: 'testuser',
      displayName: 'テストユーザー',
    }
  })

  console.log('Created test user:', testUser)

  // テスト投稿を作成
  const posts = []
  for (let i = 1; i <= 10; i++) {
    const post = await prisma.post.create({
      data: {
        content: `テスト投稿 ${i}`,
        imageUrl: `https://picsum.photos/400/400?random=${i}`,
        latitude: 35.6762 + (Math.random() - 0.5) * 0.1,
        longitude: 139.6503 + (Math.random() - 0.5) * 0.1,
        address: `東京都テスト区テスト町${i}`,
        authorId: testUser.id,
      }
    })
    posts.push(post)
  }

  console.log('Created test posts:', posts.length)

  // 各投稿に対してPostImageDetailを作成（ゲーム用の AI分析データ）
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    try {
      // 直接SQLを使用してPostImageDetailを作成
      await prisma.$executeRaw`
        INSERT INTO post_image_details (id, postId, imageUrl, gemini_feature_vector, geminiEffectDescription, uploadedAt)
        VALUES (
          ${`detail_${post.id}_${i}`, 
          post.id,
          post.imageUrl || `https://picsum.photos/400/400?random=${i + 1}`,
          JSON_OBJECT(
            'beauty', ${Math.floor(Math.random() * 10) + 1},
            'impact', ${Math.floor(Math.random() * 10) + 1},
            'soothing', ${Math.floor(Math.random() * 10) + 1},
            'uniqueness', ${Math.floor(Math.random() * 10) + 1},
            'storytelling', ${Math.floor(Math.random() * 10) + 1}
          ),
          ${'この写真は' + ['美しい', '迫力のある', '癒やされる', 'ユニークな', '物語性のある'][Math.floor(Math.random() * 5)] + '雰囲気を持っています。'},
          NOW()
        )
      `
      console.log(`Created PostImageDetail for post ${i + 1}`)
    } catch (error) {
      console.error(`Error creating PostImageDetail for post ${i + 1}:`, error)
    }
  }

  console.log('Database seeded successfully with test data!')
  console.log('Test user ID:', testUser.id)
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