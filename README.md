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

## 次の一手（未実装の発展案）

- Supabase へのデータ移行＋サーバー認証
- TikTok oEmbed によるサムネ事前取得でさらに高速化
- 掲載依頼/停止依頼のメール通知
- 無限スクロール（フィード継ぎ足し）
