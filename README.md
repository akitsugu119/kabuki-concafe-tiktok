# かぶきコンカフェ嬢TikTokまとめ

歌舞伎町コンカフェ嬢のTikTokを、スワイプでまとめ見できるスマホファーストのWebアプリ。

- **技術**: Next.js 14 (App Router) / TypeScript / Tailwind CSS
- **データ**: MVPは設定不要で動くよう `localStorage` 実装（`src/lib/store.ts`）。
  ここだけ差し替えれば Supabase / Firebase に移行できる。

## 起動

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 本番ビルド
```

## 画面

| パス | 内容 |
| --- | --- |
| `/` | トップ。TikTok風 縦スワイプフィード（1画面1動画） |
| `/request` | 掲載依頼フォーム |
| `/takedown` | 掲載停止・修正依頼フォーム（トラブル防止のため必須設置） |
| `/about` | サイトの方針 |
| `/admin` | 管理画面（動画CRUD・トグル・レポート・依頼確認） |

## 管理画面

- 初期パスコード: `kabuki2026`（`NEXT_PUBLIC_ADMIN_PASSCODE` で変更可）
- ⚠️ クライアント側のみの簡易認証。**本番ではサーバー認証（Supabase Auth等）に必ず置き換える。**

## 主要ファイル

- `src/lib/types.ts` … データ構造（Video / 各種依頼）
- `src/lib/sampleData.ts` … サンプル動画（仮URL。画面ではデモ表示になる）
- `src/lib/store.ts` … データ層（localStorage。Supabase差し替えポイント）
- `src/lib/feed.ts` … 表示ロジック（重み付け・連続表示防止・固定トップ枠）
- `src/lib/tiktok.ts` … TikTok URLからID抽出・公式埋め込みURL生成
- `src/components/VideoFeed.tsx` … 縦スワイプ本体（scroll-snap / 遅延読込 / 計測）

## ポリシー

- 動画ファイルは自サイトに保存しない（TikTok公式埋め込みのみ）
- ランキング/容姿評価サイトではない
- 本人・店舗からの停止依頼に対応できるよう `/takedown` を常設

## 毎朝の自動更新（最新動画の自動取得）

毎朝、各アカウントの**最新動画のURL**を取得してサイトに自動登録する仕組み。
動画ファイルは一切ダウンロードしない（メタデータのみ取得し、再生はTikTok公式埋め込み）。
ログイン不要・**公開アカウントのみ**対象。リクエスト間に8秒+ランダムの待機を入れ、
失敗したアカウントはスキップしてログに残し、処理は止まらない。

### 構成

| ファイル | 役割 |
| --- | --- |
| `accounts.json` | **店舗・源氏名・TikTokハンドルの一元管理**（手で編集OK。`active: false` で取得停止） |
| `scripts/daily-update.mjs` | 毎朝実行する本体。yt-dlp で最新動画URLを取得 |
| `scripts/migrate-accounts.mjs` | 既存サイトデータ → accounts.json への初回移行（実行済み） |
| `data/YYYY-MM-DD.json` | その日のスナップショット（動画IDで重複排除） |
| `data/new.json` | 前回実行から増えた**新規動画だけ**のまとめ |
| `data/report.html` | 朝のレポート（最新動画・NEWバッジ・最終確認日時） |
| `data/logs/` | 実行ログ（スキップ理由もここに残る） |
| `daily-update.bat` | タスクスケジューラから呼ぶ起動用バッチ |

サイト側は、登録から72時間以内の動画に **NEW バッジ**、画面右上に**最終確認日時**を表示する。

### 事前準備

```bash
winget install yt-dlp.yt-dlp   # yt-dlp（メタデータ取得に使用）
```

`.env.local` に `ADMIN_SECRET`（サイトへの自動登録に使用）が必要。

### 手動実行

```bash
node scripts/daily-update.mjs            # 通常実行
SYNC=0 node scripts/daily-update.mjs     # サイト登録なしのテスト実行
```

### 毎朝7時の自動実行設定

**Windows（タスクスケジューラ）** — 管理者でなくてもOK。コマンド1発:

```bat
schtasks /Create /TN "KabukiTikTokDaily" /TR "\"C:\Users\tugu1\Downloads\新しいフォルダー (2)\kabuki-concafe-tiktok\daily-update.bat\"" /SC DAILY /ST 07:00 /F
```

GUIの場合: タスクスケジューラ → 基本タスクの作成 → 毎日 7:00 →
プログラムの開始 → `daily-update.bat` を指定。
作成後にプロパティで「**スケジュールされた時刻にタスクを開始できなかった場合、すぐにタスクを実行する**」に
チェックを入れると、7時にPCが起きていなくても起動後に実行される。
削除は `schtasks /Delete /TN "KabukiTikTokDaily" /F`。

**Mac/Linux（cron）**:

```cron
0 7 * * * cd /path/to/kabuki-concafe-tiktok && node scripts/daily-update.mjs >> data/logs/cron.log 2>&1
```

**Mac（launchd）**: `~/Library/LaunchAgents/com.kabuki.daily.plist` を作成し
`StartCalendarInterval` の `Hour=7, Minute=0` で `node scripts/daily-update.mjs` を指定 →
`launchctl load ~/Library/LaunchAgents/com.kabuki.daily.plist`。

### レート制限・安全設計

- アカウント間に **8秒+ランダム0〜5秒** の待機（`SLEEP_MS` で変更可）
- 1アカウントの取得は最新 **3本のみ**（`PER_ACCOUNT` で変更可）
- 取得失敗は**そのアカウントだけスキップ**してログに記録、翌朝に自動リトライ
- サイト登録失敗（ネット断など）も翌朝に自動で再試行される（台帳 `data/known-videos.json` 方式）

## 次の一手（未実装の発展案）

- Supabase へのデータ移行＋サーバー認証
- 掲載依頼/停止依頼のメール通知
