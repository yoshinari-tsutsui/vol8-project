// ゲーム開始時に手札を準備し、初期状態を返すAPI

import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

// Prismaクライアントの初期化
const prisma = new PrismaClient();

// FIXED_STAT_TYPES と THEME_TYPES はこのAPIでは直接使用しないため削除
// これらの定数は app/game/page.tsx, app/api/game/generate-effect/route.ts, app/api/game/play-round/route.ts で定義・使用されます

// GETリクエストを処理する関数
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ message: 'ユーザーIDが必要です。' }, { status: 400 });
        }

        // PostImageDetailがない場合は、Postから直接手札を作成
        let userImageDetails = await prisma.postImageDetail.findMany({
            where: {
                post: {
                    authorId: userId,
                },
                geminiFeatureVector: {
                    not: Prisma.JsonNull,
                },
                geminiEffectDescription: {
                    not: null,
                }
            },
            include: {
                post: {
                    select: {
                        content: true,
                    }
                }
            },
            orderBy: {
                uploadedAt: 'desc',
            },
            take: 20,
        });

        // PostImageDetailがない場合は、Postから直接取得してモックデータを作成
        if (userImageDetails.length < 5) {
            const userPosts = await prisma.post.findMany({
                where: {
                    authorId: userId,
                    imageUrl: {
                        not: null
                    }
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: 10,
            });

            if (userPosts.length < 5) {
                return NextResponse.json({ 
                    message: '手札を生成するのに十分な画像付き投稿がありません。少なくとも5枚必要です。' 
                }, { status: 400 });
            }

            // Postからモックの手札データを作成
            userImageDetails = userPosts.slice(0, 5).map((post, index) => ({
                id: `mock_${post.id}_${index}`,
                imageUrl: post.imageUrl!,
                geminiFeatureVector: {
                    beauty: Math.floor(Math.random() * 10) + 1,
                    impact: Math.floor(Math.random() * 10) + 1,
                    soothing: Math.floor(Math.random() * 10) + 1,
                    uniqueness: Math.floor(Math.random() * 10) + 1,
                    storytelling: Math.floor(Math.random() * 10) + 1,
                },
                geminiEffectDescription: `この写真は${['美しい', '迫力のある', '癒やされる', 'ユニークな', '物語性のある'][Math.floor(Math.random() * 5)]}雰囲気を持っています。`,
                post: {
                    content: post.content,
                }
            }));
        }

        const shuffledImageDetails = userImageDetails.sort(() => 0.5 - Math.random());
        const hand = shuffledImageDetails.slice(0, 5);

        const initialState = {
            player1Hand: hand,
            player2Hand: [],
            player1Score: 0,
            player2Score: 0,
            round: 0,
            player1UsedCards: {},
            player2UsedCards: {},
            lastRoundResult: null,
        };

        return NextResponse.json(initialState, { status: 200 });

    } catch (error: unknown) {
        console.error('ゲーム開始APIエラー:', error);
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
