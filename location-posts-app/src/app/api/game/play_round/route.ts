// ゲームのラウンド進行と勝敗判定を行うAPI

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 修正: import { prisma } を使用
import { Prisma } from '@prisma/client'; // 追加: Prismaオブジェクトをインポート

// --- ここからゲーム定数の再定義 ---
const FIXED_STAT_TYPES = [
    { key: 'beauty', name: '美麗さ', prompt: '美麗さ' },
    { key: 'impact', name: '迫力', prompt: '迫力' },
    { key: 'soothing', name: '癒やし', prompt: '癒やし' },
    { key: 'uniqueness', name: 'ユニークさ', prompt: 'ユニークさ' },
    { key: 'storytelling', name: 'ストーリー性', prompt: 'ストーリー性' },
];
const THEME_TYPES = [
    '喜び', '安らぎ', '興奮', '静けさ', '賑やかさ', '神秘的', '日常',
    '春', '夏', '秋', '冬', '水', '空', '光', '夕焼け',
    '希望', '挑戦', '変化', '繋がり', '自由',
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

// PostImageDetailにPostリレーションがインクルードされた場合の型定義
// Prismaの$transactionやselect/includeで得られる複雑な型を扱うための推奨方法
type PostImageDetailWithPost = Prisma.PostImageDetailGetPayload<{
    include: {
        post: {
            select: {
                content: true;
            };
        };
    };
}>;

// クライアントから送られてくる手札のカードの型（PostImageDetailとPost.contentを含む）
interface ClientGameCard {
    id: string;
    imageUrl: string;
    geminiFeatureVector: GeminiFeatures | null;
    geminiEffectDescription: string | null;
    post: {
        content: string | null;
    };
}

// POSTリクエストのボディの型定義を追加
interface PlayRoundRequestBody {
    player1Id: string;
    player1SelectedImageDetailId: string;
    player1Hand: ClientGameCard[];
    player1UsedCards: { [id: string]: number };
    currentRound: number;
    // player2UsedCards はクライアントから送られてくる可能性があり、
    // サーバー側で安全に扱うためにデフォルト値を設定
    player2UsedCards?: { [id: string]: number };
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

// Gemini APIを呼び出して写真の評価を取得する汎用関数
async function getGeminiScore(
    imageUrl: string,
    promptText: string,
    apiKey: string,
    maxRetries: number
): Promise<number | null> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const { data: base64ImageData, mimeType } = await imageUrlToBase64(imageUrl);

            const payload = {
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: promptText },
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
                const text = geminiResult.candidates[0].content.parts[0].text;
                const score = parseInt(text.trim(), 10);

                if (!isNaN(score) && score >= 1 && score <= GEMINI_SCORE_SCALE) {
                    return score;
                } else {
                    console.warn(`Gemini API returned non-numeric or out-of-range value (${text}). Retrying...`);
                }
            } else {
                console.warn("Gemini API did not return a valid content. Retrying...", geminiResult);
            }
        } catch (error) {
            console.error(`Error calling Gemini API (retry ${i + 1}/${maxRetries}):`, error);
        }
    }
    console.error("Failed to get valid score from Gemini API after multiple retries.");
    return null;
}


// POSTリクエストを処理する関数
export async function POST(request: Request) {
    try {
        const {
            player1Id,
            player1SelectedImageDetailId,
            player1Hand,
            player1UsedCards,
            currentRound,
            player2UsedCards: clientPlayer2UsedCards = {}, // クライアントからのplayer2UsedCardsを受け取り、デフォルト値を設定
        }: PlayRoundRequestBody = await request.json(); // リクエストボディに型を適用

        // --- 1. 入力値のバリデーション ---
        if (!player1Id || !player1SelectedImageDetailId || !player1Hand || !player1UsedCards || currentRound === undefined) {
            return NextResponse.json({ message: '必須のゲーム情報が不足しています。' }, { status: 400 });
        }

        // --- 2. 同じ写真2回までルールを適用 ---
        const p1UsedCount = player1UsedCards[player1SelectedImageDetailId] || 0;
        if (p1UsedCount >= 2) {
            return NextResponse.json({ message: 'このカードは既に2回使用されています。別のカードを選んでください。' }, { status: 400 });
        }

        // プレイヤー1が選んだPostImageDetailの詳細情報を取得 (Postリレーションを含む)
        const player1ImageDetail: PostImageDetailWithPost | null = await prisma.postImageDetail.findUnique({
            where: { id: player1SelectedImageDetailId },
            include: { post: { select: { content: true } } }
        });

        if (!player1ImageDetail || !player1ImageDetail.imageUrl || !player1ImageDetail.post) {
            return NextResponse.json({ message: 'プレイヤー1の選択した画像が見つからないか、URLまたは関連投稿がありません。' }, { status: 404 });
        }

        // プレイヤー2の選択（今回はシンプルにランダムなCPUの選択を想定）
        let player2ImageDetail: PostImageDetailWithPost | null = null;
        let selectedP2ImageDetailId: string | null = null;

        // プレイヤー1の手札から、まだ使われていないカードをランダムに選ぶ（CPUの擬似手札）
        const availableP2Cards = player1Hand.filter((card: ClientGameCard) => {
            const usedCount = clientPlayer2UsedCards[card.id] || 0; // CPUの使用済みカードも参照
            return usedCount < 2 && card.id !== player1SelectedImageDetailId;
        });

        if (availableP2Cards.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableP2Cards.length);
            selectedP2ImageDetailId = availableP2Cards[randomIndex].id;
            // CPUが選んだPostImageDetailの詳細情報を取得 (Postリレーションを含む)
            player2ImageDetail = await prisma.postImageDetail.findUnique({
                where: { id: selectedP2ImageDetailId },
                include: { post: { select: { content: true } } }
            }) as PostImageDetailWithPost | null; // 明示的なキャスト
        }

        // CPUが有効なカードを選択できなかった場合のハンドリング
        if (!player2ImageDetail || !player2ImageDetail.imageUrl || !player2ImageDetail.post) {
            // この場合、CPUはカードを出せないので、ラウンドは引き分けにするか、特別な処理を行う
            // ここでは、エラーとして返さず、引き分けとして処理を進める
            console.warn("CPU could not select a valid card. Round will be a draw.");
            return NextResponse.json({
                roundResult: {
                    comparisonType: 'draw', // 特殊な比較タイプ
                    comparisonDetail: 'CPUカードなし',
                    player1Card: {
                        id: player1ImageDetail.id,
                        imageUrl: player1ImageDetail.imageUrl,
                        content: player1ImageDetail.post?.content || 'No Content',
                        value: null, // CPUがカードを出せないので評価なし
                        geminiEffectDescription: player1ImageDetail.geminiEffectDescription,
                    },
                    player2Card: {
                        id: 'N/A', // CPUカードなし
                        imageUrl: 'https://placehold.co/100x100?text=CPU+Skipped',
                        content: 'CPUがカードを出せませんでした。',
                        value: null,
                        geminiEffectDescription: null,
                    },
                    winner: 'draw',
                    scoreChange: { player1: 0, player2: 0 }
                },
                updatedPlayer1UsedCards: {
                    ...player1UsedCards,
                    [player1SelectedImageDetailId]: (player1UsedCards[player1SelectedImageDetailId] || 0) + 1
                },
                updatedPlayer2UsedCards: clientPlayer2UsedCards, // CPUのカード使用状況は変化なし
            }, { status: 200 });
        }


        // --- 3. ラウンドの比較タイプとテーマを決定 ---
        const isFixedStatRound = Math.random() < 0.5;
        let comparisonType: 'fixedStat' | 'theme';
        let comparisonDetail: string;

        if (isFixedStatRound) {
            comparisonType = 'fixedStat';
            const randomIndex = Math.floor(Math.random() * FIXED_STAT_TYPES.length);
            comparisonDetail = FIXED_STAT_TYPES[randomIndex].key;
        } else {
            comparisonType = 'theme';
            const randomIndex = Math.floor(Math.random() * THEME_TYPES.length);
            comparisonDetail = THEME_TYPES[randomIndex];
        }

        let player1ScoreChange = 0;
        let player2ScoreChange = 0;
        let roundWinner: 'player1' | 'player2' | 'draw' = 'draw';
        let comparisonValue1: number | null = null;
        let comparisonValue2: number | null = null;

        const apiKey = process.env.GEMINI_API_KEY || "";
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not set.");
            return NextResponse.json({ message: 'Gemini APIキーが設定されていません。' }, { status: 500 });
        }

        // --- 4. 勝敗判定ロジック ---
        if (comparisonType === 'fixedStat') {
            const p1Features = player1ImageDetail.geminiFeatureVector as GeminiFeatures;
            const p2Features = player2ImageDetail.geminiFeatureVector as GeminiFeatures;

            comparisonValue1 = p1Features ? (p1Features[comparisonDetail] || 0) : 0;
            comparisonValue2 = p2Features ? (p2Features[comparisonDetail] || 0) : 0;

            if (comparisonValue1 > comparisonValue2) {
                roundWinner = 'player1';
            } else if (comparisonValue2 > comparisonValue1) {
                roundWinner = 'player2';
            } else {
                roundWinner = 'draw';
            }

        } else {
            const promptForGemini = `この写真がどれくらい「${comparisonDetail}」らしいか、1から${GEMINI_SCORE_SCALE}の数値で評価してください。数字だけを答えてください。`;

            comparisonValue1 = await getGeminiScore(player1ImageDetail.imageUrl, promptForGemini, apiKey, GEMINI_MAX_RETRIES);
            comparisonValue2 = await getGeminiScore(player2ImageDetail.imageUrl, promptForGemini, apiKey, GEMINI_MAX_RETRIES);

            if (comparisonValue1 === null || comparisonValue2 === null) {
                roundWinner = 'draw';
                console.warn("Gemini API score could not be obtained for one or both players. Round is a draw.");
            } else if (comparisonValue1 > comparisonValue2) {
                roundWinner = 'player1';
            } else if (comparisonValue2 > comparisonValue1) {
                roundWinner = 'player2';
            } else {
                roundWinner = 'draw';
            }
        }

        // --- 5. ラウンド結果の更新 ---
        if (roundWinner === 'player1') {
            player1ScoreChange = 1;
        } else if (roundWinner === 'player2') {
            player2ScoreChange = 1;
        }

        // --- 6. 使用済みカードの更新 ---
        const updatedPlayer1UsedCards = {
            ...player1UsedCards,
            [player1SelectedImageDetailId]: (player1UsedCards[player1SelectedImageDetailId] || 0) + 1
        };
        const updatedPlayer2UsedCards = {
            ...clientPlayer2UsedCards, // クライアントから受け取った状態をベースにする
        };
        // CPUがカードを出した場合のみ、そのカードの使用回数を更新
        if (selectedP2ImageDetailId) {
            updatedPlayer2UsedCards[selectedP2ImageDetailId] = (updatedPlayer2UsedCards[selectedP2ImageDetailId] || 0) + 1;
        }


        // --- 7. レスポンスを返す ---
        return NextResponse.json(
            {
                roundResult: {
                    comparisonType: comparisonType,
                    comparisonDetail: comparisonDetail,
                    player1Card: {
                        id: player1ImageDetail.id,
                        imageUrl: player1ImageDetail.imageUrl,
                        content: player1ImageDetail.post?.content || 'No Content',
                        value: comparisonValue1,
                        geminiEffectDescription: player1ImageDetail.geminiEffectDescription,
                    },
                    player2Card: {
                        id: player2ImageDetail.id, // CPUがカードを出せなかった場合でもidは必要
                        imageUrl: player2ImageDetail.imageUrl,
                        content: player2ImageDetail.post?.content || 'No Content',
                        value: comparisonValue2,
                        geminiEffectDescription: player2ImageDetail.geminiEffectDescription,
                    },
                    winner: roundWinner,
                    scoreChange: { player1: player1ScoreChange, player2: player2ScoreChange }
                },
                updatedPlayer1UsedCards: updatedPlayer1UsedCards,
                updatedPlayer2UsedCards: updatedPlayer2UsedCards,
            },
            { status: 200 }
        );

    } catch (error: unknown) {
        console.error('ラウンド進行APIエラー:', error);
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
