# connect-token-server

`connect-token-server` は、Pipedream Connect Token を発行するためのシンプルな Node.js + Express サーバーです。
主に OAuth 認証の初期ステップとして、`connect_token` を取得する目的で使います。

---

## 🚀 概要

- `/connect-token` エンドポイントにアクセスすると、指定した `external_user_id` に対して Pipedream の Connect Token を発行します。
- フロントエンドアプリ（例：Next.js）との組み合わせを想定しています。

---

## 📂 フォルダ構成（最小構成）

```
connect-token-server/
├── connect-token-server.ts
├── package.json
├── .env            # ローカル用（.env.example を参考に）
├── .env.example    # 必要な環境変数のテンプレート
└── README.md       # このファイル
```

---

## ⚙️ 使用方法

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. .env ファイルの作成

`.env.example` をコピーして `.env` を作成し、各種キーを設定してください。

```bash
cp .env.example .env
```

### 3. サーバーの起動

```bash
npx tsx connect-token-server.ts
```

起動後、`http://localhost:3001/connect-token` にアクセスすると、JSON形式でトークンが取得できます。

---

## 🔐 使用している環境変数

- `PIPEDREAM_CLIENT_ID`
- `PIPEDREAM_CLIENT_SECRET`
- `PIPEDREAM_PROJECT_ID`
- `PIPEDREAM_ENVIRONMENT`（例: development または production）
- `PIPEDREAM_EXTERNAL_USER_ID`

---

## 💡 備考

- `allowed_origins` は必要に応じて変更してください（現在は `http://localhost:3000` に限定）
- 現状は `GET /connect-token` のみを提供するシンプルな構成です

---

## 🧡 作者メモ

これは、自分自身のために書いた最初のMCP周辺ツールの一つです。
コードはシンプルで最小限ですが、実際にPipedreamとの統合に使える実用的な仕組みです。
将来的には他の機能も追加していくかも…？

---

## 📚 参考

- [Pipedream Docs - Connect Tokens](https://pipedream.com/docs/auth/connect-tokens/)
- [OpenAI Agent SDK](https://github.com/openai/agents)

---

## 👤 Author

[@yuutotsuki](https://github.com/yuutotsuki) 