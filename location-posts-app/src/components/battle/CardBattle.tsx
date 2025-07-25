"use client"
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

// --- ここからゲーム定数の定義 ---
export const FIXED_STAT_TYPES = [
    { key: 'beauty', name: '美麗さ', prompt: '美麗さ' },
    { key: 'impact', name: '迫力', prompt: '迫力' },
    { key: 'soothing', name: '癒やし', prompt: '癒やし' },
    { key: 'uniqueness', name: 'ユニークさ', prompt: 'ユニークさ' },
    { key: 'storytelling', name: 'ストーリー性', prompt: 'ストーリー性' },
];
export const THEME_TYPES = [
    '喜び', '安らぎ', '興奮', '静けさ', '賑やかさ', '神秘的', '日常',
    '春', '夏', '秋', '冬', '水', '空', '光', '夕焼け',
    '希望', '挑戦', '変化', '繋がり', '自由',
];
export const GEMINI_SCORE_SCALE = 10;
export const GEMINI_MAX_RETRIES = 3;
// --- ここまでゲーム定数の定義 ---

// Gemini APIから返される画像特徴の型定義
interface GeminiFeatures {
    beauty?: number;
    impact?: number;
    soothing?: number;
    uniqueness?: number;
    storytelling?: number;
    [key: string]: number | undefined;
}

// PostImageDetailの型定義 (APIレスポンスに合わせて調整)
interface GameCard {
    id: string;
    imageUrl: string;
    geminiFeatureVector: GeminiFeatures | null;
    geminiEffectDescription: string | null;
    post: {
        content: string | null;
    };
}

// ラウンド結果の型定義
interface RoundResult {
    comparisonType: 'fixedStat' | 'theme' | 'draw'; // 'draw' タイプを追加
    comparisonDetail: string;
    player1Card: { id: string; imageUrl: string; content: string | null; value: number | null; geminiEffectDescription: string | null; };
    player2Card: { id: string; imageUrl: string; content: string | null; value: number | null; geminiEffectDescription: string | null; };
    winner: 'player1' | 'player2' | 'draw';
    scoreChange: { player1: number; player2: number; };
}

// ゲームの状態管理のための型定義
interface GameState {
    player1Hand: GameCard[];
    player2Hand: GameCard[];
    player1Score: number;
    player2Score: number;
    round: number;
    player1UsedCards: { [id: string]: number };
    player2UsedCards: { [id: string]: number };
    lastRoundResult: RoundResult | null;
    status: 'idle' | 'loading' | 'playing' | 'gameOver';
    message: string;
    currentPlayerId: string;
}

const CardBattle: React.FC = () => {
    const { data: session } = useSession();
    
    const [gameState, setGameState] = useState<GameState>({
        player1Hand: [],
        player2Hand: [],
        player1Score: 0,
        player2Score: 0,
        round: 0,
        player1UsedCards: {},
        player2UsedCards: {},
        lastRoundResult: null,
        status: 'idle',
        message: 'ゲームを開始してください。',
        currentPlayerId: 'cmdivaq5h0000w5lscmrer2js', // デフォルトはテストユーザーID
    });

    // セッションが変わったらplayerIdを更新
    useEffect(() => {
        if (session?.user?.id) {
            setGameState(prev => ({
                ...prev,
                currentPlayerId: session.user.id
            }));
        }
    }, [session]);

    const startGame = async () => {
        setGameState(prev => ({ ...prev, status: 'loading', message: 'ゲームを準備中...' }));
        try {
            const response = await axios.get(`/api/game/start?userId=${gameState.currentPlayerId}`);
            setGameState(prev => ({
                ...prev,
                player1Hand: response.data.player1Hand,
                player2Hand: response.data.player2Hand,
                player1Score: 0,
                player2Score: 0,
                round: 1,
                player1UsedCards: {},
                player2UsedCards: {},
                lastRoundResult: null,
                status: 'playing',
                message: '手札を選んでください！',
            }));
        } catch (error: unknown) {
            console.error('ゲーム開始エラー:', error);
            let errorMessage = 'ゲーム開始失敗';
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            setGameState(prev => ({ ...prev, status: 'idle', message: `ゲーム開始失敗: ${errorMessage}` }));
        }
    };

    const handleCardSelect = async (selectedImageDetailId: string) => {
        if (gameState.status !== 'playing' || gameState.round > 5) return;

        const usedCount = gameState.player1UsedCards[selectedImageDetailId] || 0;
        if (usedCount >= 2) {
            setGameState(prev => ({ ...prev, message: 'このカードは既に2回使用されています。別のカードを選んでください。' }));
            return;
        }

        setGameState(prev => ({ ...prev, status: 'loading', message: 'ラウンド処理中...' }));

        try {
            const response = await axios.post('/api/game/play-round', {
                player1Id: gameState.currentPlayerId,
                player1SelectedImageDetailId: selectedImageDetailId,
                player1Hand: gameState.player1Hand,
                player1UsedCards: gameState.player1UsedCards,
                player2UsedCards: gameState.player2UsedCards,
                currentRound: gameState.round,
            });

            const result: RoundResult = response.data.roundResult;
            const updatedPlayer1UsedCards = response.data.updatedPlayer1UsedCards;
            const updatedPlayer2UsedCards = response.data.updatedPlayer2UsedCards;

            const newPlayer1Score = gameState.player1Score + result.scoreChange.player1;
            const newPlayer2Score = gameState.player2Score + result.scoreChange.player2;

            setGameState(prev => ({
                ...prev,
                player1Score: newPlayer1Score,
                player2Score: newPlayer2Score,
                round: prev.round + 1,
                player1UsedCards: updatedPlayer1UsedCards,
                player2UsedCards: updatedPlayer2UsedCards,
                lastRoundResult: result,
                status: 'playing',
                message: '次のラウンドへ！',
            }));

            if (newPlayer1Score >= 3 || newPlayer2Score >= 3 || gameState.round + 1 > 5) {
                setGameState(prev => ({ ...prev, status: 'gameOver', message: 'ゲーム終了！' }));
            }

        } catch (error: unknown) {
            console.error('ラウンド進行エラー:', error);
            let errorMessage = 'ラウンド失敗';
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            setGameState(prev => ({ ...prev, status: 'playing', message: `ラウンド失敗: ${errorMessage}` }));
        }
    };

    const getCardStyle = (cardId: string) => {
        const usedCount = gameState.player1UsedCards[cardId] || 0;
        const style: React.CSSProperties = {};
        let className = "bg-gray-50 p-3 rounded-lg shadow-md flex flex-col items-center cursor-pointer transition duration-200 ease-in-out hover:shadow-lg ";

        if (usedCount >= 2) {
            className += 'opacity-50 border-2 border-red-500 ';
            style.cursor = 'not-allowed';
        } else {
            className += 'hover:scale-105 ';
        }

        if (gameState.lastRoundResult?.player1Card.id === cardId) {
            className += 'border-2 border-blue-500 ';
        }
        return { style, className };
    };

    // 認証されていない場合のメッセージ
    if (!session) {
        return (
            <div className="w-full text-center">
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">ログインが必要です</h3>
                    <p className="text-yellow-700 mb-4">写真バトルゲームを開始するには、まずログインしてください。</p>
                    <a href="/" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">
                        ホームに戻る
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {gameState.status === 'idle' && (
                <div className="text-center">
                    <button
                        onClick={startGame}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                    >
                        ゲーム開始
                    </button>
                </div>
            )}

            {(gameState.status === 'playing' || gameState.status === 'gameOver' || gameState.status === 'loading') && (
                <div className="bg-white p-6 rounded-lg shadow-xl w-full mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-gray-700">
                            ラウンド: {gameState.round} / 5
                        </h2>
                        <div className="text-xl font-bold">
                            スコア: あなた {gameState.player1Score} - CPU {gameState.player2Score}
                        </div>
                    </div>
                    <p className="text-center text-lg text-gray-600 mb-4">{gameState.message}</p>

                    {gameState.lastRoundResult && (
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                ラウンド {gameState.round - 1} 結果:
                            </h3>
                            <p className="text-md text-gray-600 mb-2">
                                比較タイプ: {gameState.lastRoundResult.comparisonType === 'fixedStat' ? '固定ステータス' : 'テーマ'}
                                ({gameState.lastRoundResult.comparisonDetail})
                            </p>
                            <div className="flex justify-around items-center gap-4">
                                <div className="text-center">
                                    <p className="font-medium">あなたのカード:</p>
                                    <Image
                                        src={gameState.lastRoundResult.player1Card.imageUrl || 'https://placehold.co/100x100?text=No+Image'}
                                        alt="Player 1 Card"
                                        width={100} height={100}
                                        className="rounded-md shadow-sm mx-auto object-cover"
                                    />
                                    <p className="text-sm">{gameState.lastRoundResult.player1Card.content?.substring(0, 20) || 'No Content'}</p>
                                    <p className="font-bold text-lg">評価: {gameState.lastRoundResult.player1Card.value !== null ? gameState.lastRoundResult.player1Card.value : 'N/A'}</p>
                                    <p className="text-xs text-gray-500 mt-1">効果: {gameState.lastRoundResult.player1Card.geminiEffectDescription || 'なし'}</p>
                                </div>
                                <div className="text-2xl font-bold text-gray-800">VS</div>
                                <div className="text-center">
                                    <p className="font-medium">CPUのカード:</p>
                                    <Image
                                        src={gameState.lastRoundResult.player2Card.imageUrl || 'https://placehold.co/100x100?text=No+Image'}
                                        alt="Player 2 Card"
                                        width={100} height={100}
                                        className="rounded-md shadow-sm mx-auto object-cover"
                                    />
                                    <p className="text-sm">{gameState.lastRoundResult.player2Card.content?.substring(0, 20) || 'No Content'}</p>
                                    <p className="font-bold text-lg">評価: {gameState.lastRoundResult.player2Card.value !== null ? gameState.lastRoundResult.player2Card.value : 'N/A'}</p>
                                    <p className="text-xs text-gray-500 mt-1">効果: {gameState.lastRoundResult.player2Card.geminiEffectDescription || 'なし'}</p>
                                </div>
                            </div>
                            <p className="text-center text-xl font-bold mt-2">
                                勝者: {gameState.lastRoundResult.winner === 'player1' ? 'あなた！' : gameState.lastRoundResult.winner === 'player2' ? 'CPU！' : '引き分け'}
                            </p>
                        </div>
                    )}

                    {gameState.status === 'playing' && gameState.round <= 5 && (
                        <div className="mt-6">
                            <h3 className="text-xl font-semibold text-gray-700 mb-3">あなたの手札:</h3>
                            <div className="grid grid-cols-3 gap-4">
                                {gameState.player1Hand.map(card => {
                                    const { style, className } = getCardStyle(card.id);
                                    return (
                                        <div
                                            key={card.id}
                                            className={className}
                                            onClick={() => handleCardSelect(card.id)}
                                            style={style}
                                        >
                                            <Image
                                                src={card.imageUrl || 'https://placehold.co/100x100?text=No+Image'}
                                                alt={card.post?.content || '投稿画像'}
                                                width={100}
                                                height={100}
                                                className="rounded-md mb-2 object-cover"
                                            />
                                            <p className="text-sm text-gray-700 text-center mb-1 line-clamp-2">{card.post?.content || '写真'}</p>
                                            <div className="text-xs text-gray-500">
                                                使用回数: {gameState.player1UsedCards[card.id] || 0} / 2
                                            </div>
                                            {card.geminiFeatureVector && (
                                                <div className="text-xs text-gray-600 mt-1">
                                                    {FIXED_STAT_TYPES.map(stat => (
                                                        <span key={stat.key} className="mr-1">
                                                            {stat.name.substring(0, 2)}: {(card.geminiFeatureVector as GeminiFeatures)[stat.key] || 0}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-gray-500 mt-1">効果: {card.geminiEffectDescription || 'なし'}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {gameState.status === 'gameOver' && (
                        <div className="mt-6 text-center">
                            <h3 className="text-2xl font-bold text-gray-800">
                                {gameState.player1Score > gameState.player2Score ? 'あなたの勝利！おめでとう！' :
                                gameState.player2Score > gameState.player1Score ? 'CPUの勝利！残念！' : '引き分け！'}
                            </h3>
                            <button
                                onClick={startGame}
                                className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-5 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
                            >
                                もう一度プレイする
                            </button>
                        </div>
                    )}
                </div>
            )}

            {gameState.status === 'loading' && (
                <div className="flex items-center justify-center mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <p className="ml-3 text-gray-700">{gameState.message}</p>
                </div>
            )}
        </div>
    );
};

export default CardBattle;