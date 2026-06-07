// ===================================================================
// データ構造（STEP 3）
// 動画 1 本ぶんのデータ。公開画面・管理画面の両方でこの型を使う。
// ===================================================================

/**
 * 表示強度。通常=1 / 弱=2 / 中=3 / 強=5。
 * 数値が大きいほどフィードに登場しやすくなる（STEP 7）。
 */
export type DisplayWeight = 1 | 2 | 3 | 5;

export const WEIGHT_LABELS: { value: DisplayWeight; label: string }[] = [
  { value: 1, label: "通常" },
  { value: 2, label: "弱" },
  { value: 3, label: "中" },
  { value: 5, label: "強" },
];

export interface Video {
  id: string;

  /** TikTok 動画 URL（埋め込み元） */
  tiktokUrl: string;
  /** 「TikTokで見る」ボタンの遷移先。基本は tiktokUrl と同じでOK */
  tiktokViewUrl: string;
  /** 表示ON/OFF。false の動画はフィードに出さない */
  isActive: boolean;

  /** ピックアップ（今注目）動画かどうか */
  isPickup: boolean;
  /** バッジ表記。初期値「今注目」 */
  badgeLabel: string;
  /** 小さなPR表記を出すか */
  showPrLabel: boolean;

  /** 店舗名（ピックアップ／固定トップで表示） */
  shopName?: string;
  /** 店舗公式URL */
  shopOfficialUrl?: string;

  /** 表示強度（DisplayWeight） */
  displayWeight: DisplayWeight;

  /** 固定トップ枠ON/OFF（最初の5本以内に1回だけ出す広告枠） */
  isFixedTop: boolean;
  /** 掲載開始日（ISO文字列）。未設定なら常時 */
  fixedTopStartDate?: string;
  /** 掲載終了日（ISO文字列）。未設定なら常時 */
  fixedTopEndDate?: string;

  /** 計測：表示回数 */
  viewCount: number;
  /** 計測：TikTokで見るクリック数 */
  tiktokClickCount: number;
  /** 計測：店舗公式クリック数 */
  shopClickCount: number;

  /** 管理用メモ（公開画面には出ない） */
  adminMemo?: string;

  createdAt: string;
  updatedAt: string;
}

// 公開画面のフィルター（STEP 6）
export type FeedFilter = "all" | "pickup" | "shop";

export const FILTERS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "pickup", label: "今注目" },
  { value: "shop", label: "店舗リンクあり" },
];

// 掲載依頼フォーム（STEP 11）
export interface PublishRequest {
  id: string;
  tiktokUrl: string;
  shopName: string;
  shopOfficialUrl: string;
  contact: string;
  wantPickup: boolean;
  message: string;
  createdAt: string;
  status: "new" | "done";
}

// 掲載停止・修正依頼フォーム（STEP 12）
export type TakedownType = "stop" | "fix" | "removeLink" | "other";

export const TAKEDOWN_TYPES: { value: TakedownType; label: string }[] = [
  { value: "stop", label: "掲載停止" },
  { value: "fix", label: "情報修正" },
  { value: "removeLink", label: "店舗リンク削除" },
  { value: "other", label: "その他" },
];

export interface TakedownRequest {
  id: string;
  tiktokUrl: string;
  type: TakedownType;
  reason: string;
  contact: string;
  createdAt: string;
  status: "new" | "done";
}
