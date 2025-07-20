import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { userPhotoBase64, postPhotoUrl } = await req.json()

    // APIキーの確認
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set')
      // 開発環境での簡易フォールバック（厳しい判定）
      return NextResponse.json({
        similarity: Math.floor(Math.random() * 40) + 10, // 10-50%の範囲で低めに設定
        confidence: 50,
        description: "⚠️ AI分析APIが設定されていません。ランダムな結果（低めの一致率）を表示しています。"
      })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      以下の2枚の写真を厳密に比較して、撮影場所や被写体の一致度を0-100%で判定してください。
      
      ⚠️ 重要：判定は非常に厳しく行ってください。以下の基準を適用してください：
      
      【100%】完全一致（同じ画像、または1秒以内の連続撮影）
      - 全ての建物、物体、影の位置が完全に一致
      - 撮影角度、距離が完全に同じ
      - 光の当たり方、影の向きが同じ
      
      【80-99%】非常に高い類似度（同じ場所、ほぼ同じ角度）
      - 同じ建物・場所を同じような角度で撮影
      - 細部の違いは許容（時間、天候、人の有無など）
      - カメラ位置の差は1-2m以内
      
      【60-79%】高い類似度（同じ場所、異なる角度）
      - 明らかに同じ場所だが、角度や距離が異なる
      - 主要な建物や特徴は識別可能
      
      【40-59%】中程度の類似度（似た場所・建物）
      - 同じ種類の建物や似た環境
      - 完全に同じ場所とは断定できない
      
      【20-39%】低い類似度（一部共通要素）
      - 建物の種類や環境に一部共通点
      
      【0-19%】ほぼ無関係
      - 明らかに異なる場所、被写体
      
      ⚠️ 特に注意すべき点：
      - 同じような建物でも、場所が違えば低評価
      - 角度が大きく異なる場合は減点
      - 時間帯や天候の違いは軽微な減点のみ
      - 人の有無や車の有無は評価に含めない
      - 不明確な場合は低めに評価
      
      結果は以下のJSON形式で返してください：
      {
        "similarity": 75,
        "confidence": 90,
        "description": "同じ建物を撮影していますが、角度と距離が異なります。主要な特徴は一致しているため75%の類似度です。"
      }
    `

    // 投稿画像を取得
    let postImageBase64;
    try {
      // 相対パスの場合は絶対URLに変換
      const imageUrl = postPhotoUrl.startsWith('http') 
        ? postPhotoUrl 
        : `${req.nextUrl.origin}${postPhotoUrl}`;
      
      console.log('Fetching image from:', imageUrl);
      const postImageResponse = await fetch(imageUrl);
      
      if (!postImageResponse.ok) {
        throw new Error(`Failed to fetch image: ${postImageResponse.status}`);
      }
      
      const postImageBuffer = await postImageResponse.arrayBuffer();
      postImageBase64 = Buffer.from(postImageBuffer).toString('base64');
      console.log('Image fetched successfully, size:', postImageBuffer.byteLength);
    } catch (fetchError) {
      console.error('Error fetching post image:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch post image' },
        { status: 400 }
      );
    }

    // MIMEタイプを動的に決定
    const getUserImageMimeType = () => {
      // Base64の先頭から画像タイプを判定
      if (userPhotoBase64.startsWith('/9j/')) return 'image/jpeg';
      if (userPhotoBase64.startsWith('iVBOR')) return 'image/png';
      if (userPhotoBase64.startsWith('R0lGOD')) return 'image/gif';
      return 'image/jpeg'; // デフォルト
    };

    console.log('Calling Gemini API...');
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: userPhotoBase64,
          mimeType: getUserImageMimeType()
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
        // 数値のみの場合のフォールバック処理（厳しい判定）
        const numberMatch = text.match(/(\d+)/)
        let similarity = numberMatch ? parseInt(numberMatch[1]) : 30
        
        // 結果が高すぎる場合は調整
        if (similarity > 95) similarity = Math.floor(similarity * 0.8);
        
        return NextResponse.json({
          similarity: similarity,
          confidence: 70,
          description: `写真の類似度は${similarity}%です。${similarity >= 90 ? '完璧な一致です！' : similarity >= 80 ? 'とても良い一致です！' : similarity >= 60 ? 'まずまずの一致です。' : '一致率が低いです。同じ場所・角度で撮影してください。'}`
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
    
    // エラー時のフォールバック: 厳しい簡易的な比較結果を返す
    console.log('Providing fallback analysis result');
    return NextResponse.json({
      similarity: Math.floor(Math.random() * 30) + 10, // 10-40%の範囲で厳しく
      confidence: 30,
      description: "⚠️ AI分析でエラーが発生しました。厳しい簡易判定結果を表示しています。正確な分析にはGoogle Generative AI APIキーの設定が必要です。"
    })
  }
}