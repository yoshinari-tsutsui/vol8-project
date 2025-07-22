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

- **user1** (alice) - Alice Johnson - ログイン中のユーザー

## 機能テスト

### プロフィール機能
1. ナビゲーションの「マイプロフィール」またはホームページの「マイプロフィール」ボタンをクリック
2. プロフィール情報、投稿一覧を確認
3. 「プロフィール編集」ボタンでプロフィール情報を編集
4. 「ブロックリスト」ボタンでブロックしたユーザーを管理

### 基本機能
- プロフィール情報の表示・編集
- 投稿一覧の表示
- ブロックリストの管理

### 将来の機能（他ユーザーとの連携）
- フォロー機能
- ブロック機能
- ユーザー間のインタラクション

## データベースリセット

テストデータをリセットしたい場合：
```bash
npm run db:reset
```

## 注意事項

- 現在は認証機能が未実装のため、user1として固定でログインしています
- 実際の画像URLはUnsplashのサンプル画像を使用しています
- 音楽URLはサンプルURLです
- テストデータは1人のユーザー（Alice Johnson）のみ作成されます
- フォロー・ブロック機能は他ユーザーが存在する場合に動作します