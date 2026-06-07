import type { DisplayWeight, Video } from "./types";

// ===================================================================
// サンプルデータ（STEP 3 / 実URL差し替え版）
// ユーザー提供の TikTok 短縮URL（vt.tiktok.com/...）を使用。
// 短縮URLは /api/resolve（oEmbed）で動画IDに解決され、公式埋め込みで再生される。
// 動画ファイルは保存しない。pickup/固定トップの店舗名はデモ用のサンプル。
// ===================================================================

const now = "2026-06-01T00:00:00.000Z";

// 提供された19本のTikTok短縮URL
const URLS = [
  "https://vt.tiktok.com/ZSQJrLcPg/",
  "https://vt.tiktok.com/ZSQJrN9rw/",
  "https://vt.tiktok.com/ZSQJrMbmP/",
  "https://vt.tiktok.com/ZSQJrRpVL/",
  "https://vt.tiktok.com/ZSQJMEEos/",
  "https://vt.tiktok.com/ZSQJrcrAP/",
  "https://vt.tiktok.com/ZSQJrGBky/",
  "https://vt.tiktok.com/ZSQJrp4Tc/",
  "https://vt.tiktok.com/ZSxokMaay/",
  "https://vt.tiktok.com/ZSxohvFkC/",
  "https://vt.tiktok.com/ZSxok6odL/",
  "https://vt.tiktok.com/ZSxok8JsX/",
  "https://vt.tiktok.com/ZSxokYW3M/",
  "https://vt.tiktok.com/ZSxokYxj8/",
  "https://vt.tiktok.com/ZSxoke46x/",
  "https://vt.tiktok.com/ZSxokN4gf/",
  "https://vt.tiktok.com/ZSxoh7cBo/",
  "https://vt.tiktok.com/ZSxokYqaR/",
  "https://vt.tiktok.com/ZSxokLjXd/",
];

// 一部だけ pickup / 固定トップにして、UIの違いをデモできるようにする
// （店舗名・店舗URLはデモ用サンプル）
type Extra = Partial<
  Pick<
    Video,
    | "isPickup"
    | "showPrLabel"
    | "shopName"
    | "shopOfficialUrl"
    | "displayWeight"
    | "isFixedTop"
    | "fixedTopStartDate"
    | "fixedTopEndDate"
    | "adminMemo"
  >
>;

const EXTRAS: Record<number, Extra> = {
  // 固定トップ枠（最初の5本以内に1回表示されるデモ）
  0: {
    isFixedTop: true,
    isPickup: true,
    showPrLabel: true,
    shopName: "（サンプル店舗）コンカフェ ねおん",
    shopOfficialUrl: "https://example.com/neon",
    displayWeight: 5,
    fixedTopStartDate: "2026-05-01T00:00:00.000Z",
    fixedTopEndDate: "2026-12-31T00:00:00.000Z",
    adminMemo: "固定トップ枠サンプル",
  },
  2: {
    isPickup: true,
    showPrLabel: true,
    shopName: "（サンプル店舗）メイドカフェ ほしぞら",
    shopOfficialUrl: "https://example.com/hoshizora",
    displayWeight: 5,
    adminMemo: "ピックアップ（強）",
  },
  5: {
    isPickup: true,
    showPrLabel: true,
    shopName: "（サンプル店舗）Cafe ゆめずく",
    shopOfficialUrl: "https://example.com/yumezuku",
    displayWeight: 3,
    adminMemo: "ピックアップ（中）",
  },
  9: {
    isPickup: true,
    showPrLabel: false,
    shopName: "（サンプル店舗）コンカフェ みるく",
    shopOfficialUrl: "https://example.com/milk",
    displayWeight: 2,
    adminMemo: "ピックアップ（弱）",
  },
};

export const SAMPLE_VIDEOS: Video[] = URLS.map((url, i) => {
  const e = EXTRAS[i] ?? {};
  return {
    id: `v${i + 1}`,
    tiktokUrl: url,
    tiktokViewUrl: url,
    isActive: true,
    isPickup: e.isPickup ?? false,
    badgeLabel: "今注目",
    showPrLabel: e.showPrLabel ?? false,
    shopName: e.shopName,
    shopOfficialUrl: e.shopOfficialUrl,
    displayWeight: (e.displayWeight ?? 1) as DisplayWeight,
    isFixedTop: e.isFixedTop ?? false,
    fixedTopStartDate: e.fixedTopStartDate,
    fixedTopEndDate: e.fixedTopEndDate,
    viewCount: 0,
    tiktokClickCount: 0,
    shopClickCount: 0,
    adminMemo: e.adminMemo,
    createdAt: now,
    updatedAt: now,
  };
});
