"use client"
import CardBattle from "@/components/battle/CardBattle"

export default function GamePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 font-inter flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-6 rounded-lg p-3 bg-white shadow-md">
        写真バトルゲーム
      </h1>
      
      <div className="w-full max-w-2xl">
        <CardBattle />
      </div>
    </div>
  )
}
