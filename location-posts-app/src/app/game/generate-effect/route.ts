// 投稿画像からGemini APIを使ってゲームの効果とステータスを生成し、データベースに保存するAPI

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 修正: import { prisma } を使用

// --- ここからゲーム定数の再定義 ---
const FIXED_STAT_TYPES = [
    { key: 'beauty', name: '美麗さ', prompt: '美麗さ' },
    { key: 'impact', name: '迫力', prompt: '迫力' },
    { key: 'soothing', name: '癒やし', prompt: '癒やし' },
    { key: 'uniqueness', name: 'ユニークさ', prompt: 'ユニークさ' },
    { key: 'storytelling', name: 'ストーリー性', prompt: 'ストーリー性' },
];
const GEMINI_SCORE_SCALE = 10;
const GEMINI_MAX_RETRIES = 3;
// --- ここまでゲーム定数の再定義 ---

// Gemini APIから返される画像特徴の型定義
interface GeminiFeatures {
    beauty?: number;
    impact?: number;
    soothing?: number;
    uniqueness?: number;
    storytelling?: number;
    [key: string]: number | undefined; // 任意の文字列キーで数値が来る可能性
}

// 画像URLから画像をフェッチし、Base64エンコードするヘルパー関数
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        return { data: buffer.toString('base64'), mimeType: mimeType };
    } catch (error) {
        console.error("Error converting image to base64:", error);
        throw new Error("Failed to convert image to Base64 for Gemini API.");
    }
}

// Gemini APIを呼び出して、指定されたプロンプトでテキストを生成する汎用関数
async function callGeminiApi(
    prompt: string,
    base64ImageData: string,
    mimeType: string,
    apiKey: string,
    maxRetries: number
): Promise<string | null> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64ImageData
                                }
                            }
                        ]
                    }
                ],
            };

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const geminiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const geminiResult = await geminiResponse.json();

            if (geminiResult.candidates && geminiResult.candidates.length > 0 &&
                geminiResult.candidates[0].content && geminiResult.candidates[0].content.parts &&
                geminiResult.candidates[0].content.parts.length > 0) {
                return geminiResult.candidates[0].content.parts[0].text;
            } else {
                console.warn(`Gemini API returned no valid content (retry ${i + 1}/${maxRetries}):`, geminiResult);
            }
        } catch (error) {
            console.error(`Error calling Gemini API (retry ${i + 1}/${maxRetries}):`, error);
        }
    }
    console.error("Failed to get valid response from Gemini API after multiple retries.");
    return null;
}

// POSTリクエストを処理する関数
export async function POST(request: Request) {
    try {
        const { postImageDetailId } = await request.json();

        if (!postImageDetailId) {
            return NextResponse.json({ message: 'postImageDetailId は必須です。' }, { status: 400 });
        }

        const postImageDetail = await prisma.postImageDetail.findUnique({
            where: { id: postImageDetailId },
        });

        if (!postImageDetail) {
            return NextResponse.json({ message: '指定された投稿画像詳細が見つかりません。' }, { status: 404 });
        }

        if (!postImageDetail.imageUrl) {
            return NextResponse.json({ message: 'この投稿画像にはURLがありません。' }, { status: 400 });
        }

        const { data: base64ImageData, mimeType } = await imageUrlToBase64(postImageDetail.imageUrl);

        const apiKey = process.env.GEMINI_API_KEY || "";
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not set in environment variables.");
            return NextResponse.json({ message: 'Gemini APIキーが設定されていません。' }, { status: 500 });
        }

        // --- 1. 5つの固定ステータスをGemini APIで生成 ---
        const generatedStats: GeminiFeatures = {};
        for (const stat of FIXED_STAT_TYPES) {
            const prompt = `この写真の「${stat.name}」を${GEMINI_SCORE_SCALE}段階で評価してください。数字だけを答えてください。`;
            const rawScore = await callGeminiApi(prompt, base64ImageData, mimeType, apiKey, GEMINI_MAX_RETRIES);
            const score = rawScore ? parseInt(rawScore.trim(), 10) : null;

            if (score !== null && !isNaN(score) && score >= 1 && score <= GEMINI_SCORE_SCALE) {
                generatedStats[stat.key] = score;
            } else {
                console.warn(`Failed to get valid score for ${stat.name}. Setting to 0.`);
                generatedStats[stat.key] = 0;
            }
        }

        // --- 2. カード効果説明をGemini APIで生成 ---
        const effectPrompt = `この写真の雰囲気に合わせて、ゆるいボードゲームで使えるようなカードの効果を生成してください。効果は短く、ポジティブなものにしてください。例: 'みんなの笑顔が弾ける！全員のHPを少し回復。'`;
        const generatedEffectDescription = await callGeminiApi(effectPrompt, base64ImageData, mimeType, apiKey, GEMINI_MAX_RETRIES);

        // データベースのPostImageDetailを更新
        const updatedPostImageDetail = await prisma.postImageDetail.update({
            where: { id: postImageDetailId },
            data: {
                geminiFeatureVector: generatedStats,
                geminiEffectDescription: generatedEffectDescription || "効果生成失敗",
            },
        });

        // 成功レスポンス
        return NextResponse.json(
            {
                message: 'ゲームステータスと効果が正常に生成され、保存されました。',
                generatedStats: generatedStats,
                generatedEffect: generatedEffectDescription,
                updatedPostImageDetail: updatedPostImageDetail,
            },
            { status: 200 }
        );

    } catch (error: unknown) { // エラーの型をunknownに変更してanyを避ける
        console.error('ゲーム効果生成APIエラー:', error);
        let errorMessage = 'サーバーエラーが発生しました。';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { message: errorMessage, error: errorMessage },
            { status: 500 }
        );
    }
}
