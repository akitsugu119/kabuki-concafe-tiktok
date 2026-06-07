# Render へのデプロイ手順

このアプリ（Next.js）を Render の **Web Service** として公開する手順です。
Render は Git リポジトリ（GitHub 等）から自動ビルドします。

---

## 手順A：GitHub にコードを上げる

1. https://github.com/new で新しいリポジトリを作成
   - Repository name: `kabuki-concafe-tiktok`（任意）
   - **Private** 推奨
   - 「Add a README」などは**チェックしない**（空のまま作成）
2. 作成後に表示される URL（例 `https://github.com/あなた/kabuki-concafe-tiktok.git`）をコピー
3. このフォルダで以下を実行（`<URL>` を差し替え）：

   ```bash
   git remote add origin <URL>
   git branch -M main
   git push -u origin main
   ```
   - 初回 push でログインを求められたら、GitHub アカウントで認証してください。

---

## 手順B：Render で Web Service を作成

### 方法1：Blueprint（render.yaml を使う・おすすめ）
1. https://dashboard.render.com → **New +** → **Blueprint**
2. 手順Aの GitHub リポジトリを選択
3. `render.yaml` が自動で読み込まれる → **Apply**
4. ビルド完了後、`https://kabuki-concafe-tiktok.onrender.com` のような URL が発行されます

### 方法2：手動設定（Blueprint を使わない場合）
1. **New +** → **Web Service** → リポジトリを選択
2. 設定：
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Environment Variables**:
     - `NODE_VERSION` = `20.18.0`
     - `NEXT_PUBLIC_ADMIN_PASSCODE` = 好きなパスコード（任意）
3. **Create Web Service** → ビルド完了で公開

---

## 公開後

- 公開URL（`https://〜.onrender.com`）に、PC・スマホ・どの回線からでもアクセスできます。
- 管理画面：`https://〜.onrender.com/admin`（パスコードは上の環境変数）
- コードを修正して `git push` すると、Render が自動で再ビルド・再デプロイします（`autoDeploy: true`）。

---

## ⚠️ 重要：データ保存について（現状）

現在、動画データや掲載依頼は **ブラウザの localStorage** に保存されています。
そのため公開サーバーでも：

- 管理画面で登録した動画は **その端末・そのブラウザにだけ** 保存され、他の人には見えません。
- スマホとPCではデータが別々になります。

**「投稿した動画を全員に見せる／サーバー側に保存する」** には、データベースの追加が必要です。
→ ご希望なら **Supabase（無料）** または **Render PostgreSQL** を組み込みます。
   `store.ts` を差し替えるだけで、画面側はそのまま使えるよう設計してあります。
