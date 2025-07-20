import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Location Posts App
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          写真と音楽を投稿して地図上で共有するアプリ
        </p>
        
        <div className="flex justify-center space-x-4">
          <Link
            href="/profile/user1"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            マイプロフィール
          </Link>
          <Link
            href="/explore"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            探索
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">アプリについて</h2>
        <div className="space-y-4 text-gray-700">
          <p>
            Location Posts Appは、位置情報と一緒に写真や音楽を投稿できるソーシャルアプリです。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">📍 位置情報投稿</h3>
              <p className="text-sm">写真や音楽と一緒に場所を記録</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold mb-2">👥 フォロー機能</h3>
              <p className="text-sm">興味のあるユーザーをフォロー</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">🔒 プライバシー</h3>
              <p className="text-sm">ブロック機能で快適な環境を</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-semibold mb-2">🎵 音楽共有</h3>
              <p className="text-sm">お気に入りの音楽を場所と一緒に</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">現在の状況</h3>
        <div className="text-sm">
          <p className="font-medium mb-2">ログイン中: Alice Johnson (@alice)</p>
          <p className="text-gray-600">
            プロフィールページで投稿やフォロー・ブロック機能をお試しください
          </p>
        </div>
      </div>
    </div>
  )
}
