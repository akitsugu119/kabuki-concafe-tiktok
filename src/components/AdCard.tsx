"use client";

import { adImageUrl, trackAdClick } from "@/lib/store";
import type { Ad } from "@/lib/types";

/**
 * フィード内に差し込む画像バナー広告（1画面1枠）。
 * 動画カードと同じ枠デザインで、タップで飛び先へ（クリック計測あり）。
 */
export default function AdCard({ ad }: { ad: Ad }) {
  const open = () => {
    if (!ad.linkUrl) return;
    trackAdClick(ad.id);
    window.open(ad.linkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="swipe-page relative flex items-center justify-center px-3">
      <div className="relative h-[78dvh] w-full max-w-[460px] overflow-hidden rounded-2xl bg-ink-900">
        <button onClick={open} className="block h-full w-full" aria-label={ad.label || "広告"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={adImageUrl(ad.id)}
            alt={ad.label || "広告"}
            className="h-full w-full object-contain"
          />
        </button>

        {/* PR バッジ（控えめ） */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          <span className="badge-pickup">
            <span aria-hidden>✦</span> 広告
          </span>
          <span className="label-pr">PR</span>
        </div>
      </div>

      {/* 下部：飛び先ボタン */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto max-w-[460px]">
          {ad.label && (
            <p className="mb-2 text-sm font-bold text-white text-neon">{ad.label}</p>
          )}
          <button onClick={open} className="btn-accent w-full">
            詳しく見る
          </button>
        </div>
      </div>
    </section>
  );
}
