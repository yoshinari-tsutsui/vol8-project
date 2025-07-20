import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('avatar') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'ファイルまたはユーザーIDが提供されていません' },
        { status: 400 }
      )
    }

    // ファイルタイプをチェック
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: '画像ファイルのみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイルサイズをチェック (5MB制限)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは5MB以下にしてください' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // アップロードディレクトリを作成
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // ファイル名を生成（ユーザーIDとタイムスタンプを使用）
    const fileExtension = file.name.split('.').pop()
    const fileName = `${userId}_${Date.now()}.${fileExtension}`
    const filePath = join(uploadDir, fileName)

    // ファイルを保存
    await writeFile(filePath, buffer)

    // 公開URLを作成
    const publicUrl = `/uploads/avatars/${fileName}`

    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: '画像が正常にアップロードされました'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'アップロード中にエラーが発生しました' },
      { status: 500 }
    )
  }
}