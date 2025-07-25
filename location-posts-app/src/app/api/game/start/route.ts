// ゲーム開始時に手札を準備し、初期状態を返すAPI

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // 修正: import { prisma } を使用
import { Prisma } from '@prisma/client'; // 追加: Prismaオブジェクトをインポート

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

        const userImageDetails = await prisma.postImageDetail.findMany({
            where: {
                post: {
                    authorId: userId,
                },
                // imageUrl は schema.prisma で非nullableなので、{ not: null } は不要
                geminiFeatureVector: {
                    not: Prisma.JsonNull, // JSON型なので Prisma.JsonNull を使用
                },
                geminiEffectDescription: {
                    not: null, // 修正: String? 型なので null を使用
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

        if (userImageDetails.length < 5) {
            return NextResponse.json({ message: '手札を生成するのに十分な画像付き投稿（ステータス・効果生成済み）がありません。少なくとも5枚必要です。' }, { status: 400 });
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
