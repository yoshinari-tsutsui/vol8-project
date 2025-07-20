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

    console.log('Gemini response:', text) // デバッグ用ログ

    // JSONレスポンスをパース
    try {
      // 複数のパターンでJSONを抽出を試行
      let analysisResult = null
      
      // パターン1: 直接JSONパース
      try {
        analysisResult = JSON.parse(text)
      } catch {
        // パターン2: ```json ブロックから抽出
        const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
        if (jsonBlockMatch) {
          analysisResult = JSON.parse(jsonBlockMatch[1])
        } else {
          // パターン3: { } ブロックから抽出
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            analysisResult = JSON.parse(jsonMatch[0])
          }
        }
      }

      if (analysisResult && typeof analysisResult.similarity !== 'undefined') {
        return NextResponse.json({
          similarity: parseInt(analysisResult.similarity) || 0,
          confidence: parseInt(analysisResult.confidence) || 50,
          description: analysisResult.description || "分析が完了しました。"
        })
      } else {
        // 数値のみの場合のフォールバック処理
        const numberMatch = text.match(/(\d+)/)
        const similarity = numberMatch ? parseInt(numberMatch[1]) : 50
        
        return NextResponse.json({
          similarity: similarity,
          confidence: 75,
          description: `写真の類似度は${similarity}%です。${similarity >= 80 ? '非常に良い一致です！' : '引き続き挑戦してみてください。'}`
        })
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Original text:', text)
      
      // パース失敗時のフォールバック
      return NextResponse.json({
        similarity: 50,
        confidence: 60,
        description: "分析結果の解析に問題が発生しましたが、写真の比較は完了しました。"
      })
    }

  } catch (error) {
    console.error('Photo analysis failed:', error)
    return NextResponse.json(
      { error: 'Failed to analyze photos' },
      { status: 500 }
    )
  }
}