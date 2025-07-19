import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { userPhotoBase64, postPhotoUrl } = await req.json()

    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" })

    const prompt = `
      以下の2枚の写真を比較して、撮影場所や被写体の一致度を0-100%で判定してください。
      特に以下の要素を重視してください：
      - 建物や風景の類似性
      - 角度や視点の類似性
      - 時間帯や天候の類似性
      - 全体的な構図の類似性
      
      結果は以下のJSON形式で返してください：
      {
        "similarity": 85,
        "confidence": 95,
        "description": "両方とも同じ建物を撮影しており、角度も非常に似ています。時間帯は異なりますが、明らかに同じ場所です。"
      }
    `

    // 投稿画像を取得
    const postImageResponse = await fetch(postPhotoUrl)
    const postImageBuffer = await postImageResponse.arrayBuffer()
    const postImageBase64 = Buffer.from(postImageBuffer).toString('base64')

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: userPhotoBase64,
          mimeType: "image/jpeg"
        }
      },
      {
        inlineData: {
          data: postImageBase64,
          mimeType: "image/jpeg"
        }
      }
    ])

    const response = await result.response
    const text = response.text()
    
    // JSONを抽出
    const jsonMatch = text.match(/\{.*\}/s)
    if (jsonMatch) {
      const analysisResult = JSON.parse(jsonMatch[0])
      return NextResponse.json(analysisResult)
    } else {
      throw new Error('Failed to parse AI response')
    }

  } catch (error) {
    console.error('Photo analysis failed:', error)
    return NextResponse.json(
      { error: 'Failed to analyze photos' },
      { status: 500 }
    )
  }
}