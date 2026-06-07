"use client";

import TikTokEmbed from "./TikTokEmbed";
import type { FeedItem } from "@/lib/feed";
import { trackShopClick, trackTiktokClick } from "@/lib/store";

interface Props {
  item: FeedItem;
  shouldLoad: boolean;
}

/**
 * 1画面1動画（STEP 4）。
 * - 通常動画：TikTok埋め込み ＋「TikTokで見る」だけ
 * - ピックアップ／固定トップ：今注目バッジ・PR表記・店舗名・店舗公式ボタンも表示
 */
export default function VideoCard({ item, shouldLoad }: Props) {
  const { video, isFixedTopSlot } = item;

  // ピックアップ表示するか（ピックアップ動画 or 固定トップ枠）
  const showPickupUI = video.isPickup || isFixedTopSlot;
  // 固定トップ枠は広告枠なので PR は常に表示
  const showPr = isFixedTopSlot ? true : video.showPrLabel;
  const hasShop = !!video.shopOfficialUrl;

  const onTikTok = () => {
    trackTiktokClick(video.id);
    window.open(video.tiktokViewUrl || video.tiktokUrl, "_blank", "noopener,noreferrer");
  };
  const onShop = () => {
    if (!video.shopOfficialUrl) return;
    trackShopClick(video.id);
    window.open(video.shopOfficialUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="swipe-page relative flex items-center justify-center px-3">
      {/* 動画本体（中央・縦長カラム） */}
      <div className="relative h-[78dvh] w-full max-w-[460px]">
        <TikTokEmbed url={video.tiktokUrl} shouldLoad={shouldLoad} />

        {/* 上部：バッジ（ピックアップ／固定トップのみ） */}
        {showPickupUI && (
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="badge-pickup">
              <span aria-hidden>✦</span>
              {video.badgeLabel || "今注目"}
            </span>
            {showPr && <span className="label-pr">PR</span>}
          </div>
        )}
      </div>

      {/* 下部：操作UI（動画の邪魔にならないよう最小限） */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto max-w-[460px]">
          {/* ピックアップ／固定トップ：店舗名 */}
          {showPickupUI && video.shopName && (
            <p className="mb-2 text-sm font-bold text-white text-neon">
              店舗名：{video.shopName}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {showPickupUI && hasShop && (
              <button onClick={onShop} className="btn-accent w-full">
                <span aria-hidden>🏬</span> 店舗公式を見る
              </button>
            )}
            <button onClick={onTikTok} className="btn-ghost w-full">
              <span aria-hidden>▶</span> TikTokで見る
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
