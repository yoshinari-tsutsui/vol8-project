# セットアップ手順

## 必要な環境
- Node.js 18以上
- MySQL 8.0以上

## セットアップ手順

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env`ファイルを作成して、以下の設定を追加してください：

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/location_posts_db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# その他の設定（必要に応じて）
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
GOOGLE_AI_API_KEY="your-google-ai-api-key"
```

### 3. データベースのセットアップ
```bash
# Prismaクライアントの生成
npx prisma generate

# データベースのマイグレーション
npx prisma migrate dev

# テストデータの投入
npm run db:seed
```

### 4. 開発サーバーの起動
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## テストユーザー

以下のテストユーザーが作成されます：

- **user1** (alice) - Alice Johnson - 現在ログイン中のユーザー
- **user2** (bob_photographer) - Bob Wilson - 写真家
- **user3** (charlie_music) - Charlie Brown - ミュージシャン
- **user4** (diana_artist) - Diana Kim - デジタルアーティスト  
- **user5** (eve_foodie) - Eve Martinez - フードブロガー

## 機能テスト

### プロフィール機能
1. ホームページから任意のユーザーをクリック
2. プロフィール情報、投稿一覧、フォロワー・フォロー中リストを確認
3. 自分のプロフィール（user1）では「プロフィール編集」ボタンをテスト

### フォロー機能
1. 他のユーザーのプロフィールページで「フォロー」ボタンをクリック
2. フォロー後、「フォロー中」に変わることを確認
3. フォロワー・フォロー中タブでリストを確認

### ブロック機能
1. 他のユーザーのプロフィールページで「ブロック」ボタンをクリック
2. 確認ダイアログでブロックを実行
3. ブロック後、フォローボタンが非表示になることを確認
4. ナビゲーションの「ブロック」ページでブロックリストを確認

## データベースリセット

テストデータをリセットしたい場合：
```bash
npm run db:reset
```

## 注意事項

- 現在は認証機能が未実装のため、user1として固定でログインしています
- 実際の画像URLはUnsplashのサンプル画像を使用しています
- 音楽URLはサンプルURLです