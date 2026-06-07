// ===================================================================
// 表示ロジック（STEP 7：表示回数アップ / STEP 8：固定トップ枠）
// -------------------------------------------------------------------
// すべて純粋関数。後から並び替えアルゴリズムだけ差し替えられるよう、
// 「シーケンス生成」と「固定トップ挿入」を分離している。
// ===================================================================

import type { Ad, FeedFilter, Video } from "./types";

// 小さなシード付き乱数（同一セッション中は安定／セッションごとに変化）
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** フィルター適用（STEP 6 の3種） */
export function applyFilter(videos: Video[], filter: FeedFilter): Video[] {
  const active = videos.filter((v) => v.isActive);
  switch (filter) {
    case "pickup":
      return active.filter((v) => v.isPickup);
    case "shop":
      return active.filter((v) => !!v.shopOfficialUrl);
    case "all":
    default:
      return active;
  }
}

/** 固定トップ枠が「今」掲載期間内かどうか（STEP 8） */
export function isFixedTopActive(v: Video, now: Date = new Date()): boolean {
  if (!v.isFixedTop || !v.isActive) return false;
  const t = now.getTime();
  if (v.fixedTopStartDate && t < new Date(v.fixedTopStartDate).getTime()) return false;
  if (v.fixedTopEndDate && t > new Date(v.fixedTopEndDate).getTime()) return false;
  return true;
}

/**
 * 重み付きシーケンス生成。
 * - displayWeight が大きいほど多く登場（通常1 / 弱2 / 中3 / 強5）
 * - 同じ動画を直近 minGap 本以内に出さない（連続表示の防止）
 * - 動画が少ない場合は gap を自動で緩める（無限ループ回避）
 */
export function buildWeightedSequence(
  videos: Video[],
  seed: number,
  minGap = 5,
  maxLen = 60
): Video[] {
  if (videos.length === 0) return [];
  if (videos.length === 1) return [videos[0]];

  const rng = mulberry32(seed);
  const remaining = new Map<string, number>();
  const lastPos = new Map<string, number>();
  videos.forEach((v) => {
    remaining.set(v.id, Math.max(1, v.displayWeight));
    lastPos.set(v.id, -Infinity);
  });

  const total = videos.reduce((s, v) => s + Math.max(1, v.displayWeight), 0);
  const targetLen = Math.min(maxLen, total);
  const byId = new Map(videos.map((v) => [v.id, v]));
  const result: Video[] = [];

  for (let pos = 0; pos < targetLen; pos++) {
    const left = videos.filter((v) => (remaining.get(v.id) ?? 0) > 0);
    if (left.length === 0) break;

    // gap を満たす候補。無ければ「最も昔に出た動画」を採用して gap を緩める。
    let candidates = left.filter((v) => pos - (lastPos.get(v.id) ?? -Infinity) > minGap);
    if (candidates.length === 0) {
      const maxGap = Math.max(...left.map((v) => pos - (lastPos.get(v.id) ?? -Infinity)));
      candidates = left.filter((v) => pos - (lastPos.get(v.id) ?? -Infinity) === maxGap);
    }
    // 直前と同じは避ける
    const prev = result[result.length - 1];
    if (prev && candidates.length > 1) {
      candidates = candidates.filter((v) => v.id !== prev.id);
    }

    // 残り重みで重み付き抽選
    const weights = candidates.map((v) => remaining.get(v.id) ?? 1);
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = rng() * sum;
    let pick = candidates[0];
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = candidates[i];
        break;
      }
    }

    result.push(byId.get(pick.id)!);
    remaining.set(pick.id, (remaining.get(pick.id) ?? 1) - 1);
    lastPos.set(pick.id, pos);
  }

  return result;
}

export interface BuildFeedOptions {
  filter: FeedFilter;
  seed: number;
  now?: Date;
  /** 固定トップ枠を挿入するか（セッションで1回だけ true にする） */
  includeFixedTop?: boolean;
  minGap?: number;
  /** フィード内に挿入する画像バナー広告 */
  ads?: Ad[];
  /** 何本ごとに広告を挿入するか（0以下で広告なし） */
  adInterval?: number;
}

/** フィードの1枠（動画 or 画像バナー広告） */
export type FeedItem =
  | {
      kind: "video";
      video: Video;
      /** この枠が固定トップ枠として挿入されたものか（PR表記の扱いに使う） */
      isFixedTopSlot: boolean;
      key: string;
    }
  | {
      kind: "ad";
      ad: Ad;
      key: string;
    };

/** 動画枠だけを取り出した型（VideoCard 用） */
export type VideoFeedItem = Extract<FeedItem, { kind: "video" }>;

/**
 * 公開フィードを組み立てるメイン関数（STEP 7 + STEP 8）。
 * 1. 表示ON＆フィルター適用
 * 2. 重みに応じてシーケンス生成（連続表示なし）
 * 3. 固定トップ枠を最初の5本以内（1〜5本目）にランダムで1回挿入
 */
export function buildFeed(allVideos: Video[], opts: BuildFeedOptions): FeedItem[] {
  const {
    filter,
    seed,
    now = new Date(),
    includeFixedTop = false,
    minGap = 5,
    ads = [],
    adInterval = 0,
  } = opts;

  const filtered = applyFilter(allVideos, filter);

  // 固定トップ枠の候補（filter=all のときだけ自然に挿入する）
  let fixedTop: Video | undefined;
  if (includeFixedTop && filter === "all") {
    const cands = allVideos
      .filter((v) => isFixedTopActive(v, now))
      .sort((a, b) => b.displayWeight - a.displayWeight);
    fixedTop = cands[0];
  }

  // 固定トップ枠の動画は通常シーケンスから除外（重複表示を防ぐ）
  const base = fixedTop ? filtered.filter((v) => v.id !== fixedTop!.id) : filtered;

  const sequence = buildWeightedSequence(base, seed, minGap);

  const videoItems: FeedItem[] = sequence.map((video, i) => ({
    kind: "video" as const,
    video,
    isFixedTopSlot: false,
    key: `${video.id}#${i}`,
  }));

  if (fixedTop) {
    const rng = mulberry32(seed + 999);
    // 1〜5本目（index 0〜4）のどこかにランダムで挿入。先頭固定はしない。
    const maxInsert = Math.min(5, videoItems.length);
    const insertAt = Math.floor(rng() * maxInsert);
    videoItems.splice(insertAt, 0, {
      kind: "video" as const,
      video: fixedTop,
      isFixedTopSlot: true,
      key: `${fixedTop.id}#fixedtop`,
    });
  }

  // 画像バナー広告を一定間隔で挿入（filter=all のときだけ）
  const activeAds = ads.filter((a) => a.isActive);
  if (filter !== "all" || adInterval <= 0 || activeAds.length === 0) {
    return videoItems;
  }

  const rng = mulberry32(seed + 7777);
  const adOrder = [...activeAds].sort(() => rng() - 0.5);

  const result: FeedItem[] = [];
  let videoCount = 0;
  let adIdx = 0;
  for (const item of videoItems) {
    result.push(item);
    videoCount++;
    if (videoCount % adInterval === 0) {
      const ad = adOrder[adIdx % adOrder.length];
      adIdx++;
      result.push({ kind: "ad", ad, key: `ad-${ad.id}#${adIdx}` });
    }
  }
  return result;
}
