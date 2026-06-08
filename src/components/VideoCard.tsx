"use client";

import { useEffect, useState } from "react";
import TikTokEmbed from "./TikTokEmbed";
import type { VideoFeedItem } from "@/lib/feed";
import { trackShopClick, trackTiktokClick } from "@/lib/store";
import { extractHandle, resolveShortLink } from "@/lib/tiktok";

interface Props {
  item: VideoFeedItem;
  shouldLoad: boolean;
  active: boolean;
  onEnded?: () => void;
}

/**
 * ハイブリッド型（1画面1動画）。
 * - 既定はサムネ表示（埋め込みを読み込まない＝同時読み込み/制限を回避）
 * - タップすると埋め込みプレーヤーを読み込んで再生（タップ＝ユーザー操作で音も出やすい）
 * - ピックアップ／固定トップは今注目バッジ・店舗情報も表示
 */
export default function VideoCard({ item, shouldLoad, active, onEnded }: Props) {
  const { video, isFixedTopSlot } = item;

  const showPickupUI = video.isPickup || isFixedTopSlot;
  const showPr = isFixedTopSlot ? true : video.showPrLabel;
  const hasShop = !!video.shopOfficialUrl;

  const [opened, setOpened] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [handle, setHandle] = useState<string | null>(extractHandle(video.tiktokUrl));

  // プレビュー用サムネを解決（近くにある時だけ。埋め込みより軽い）
  useEffect(() => {
    if (opened || !shouldLoad || thumb) return;
    let cancelled = false;
    resolveShortLink(video.tiktokUrl).then((r) => {
      if (cancelled || !r) return;
      if (r.thumbnailUrl) setThumb(r.thumbnailUrl);
      if (r.authorName) setHandle(r.authorName);
    });
    return () => {
      cancelled = true;
    };
  }, [opened, shouldLoad, thumb, video.tiktokUrl]);

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
        {opened ? (
          <TikTokEmbed url={video.tiktokUrl} shouldLoad active={active} soundOnOpen onEnded={onEnded} />
        ) : (
          <button
            onClick={(e) => {
              // タップしたカードを画面に合わせる（＝アクティブ化して確実に再生される）
              e.currentTarget.closest(".swipe-page")?.scrollIntoView();
              setOpened(true);
            }}
            aria-label="タップで再生"
            className="relative block h-full w-full overflow-hidden rounded-2xl bg-ink-800"
          >
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={"/api/thumb?url=" + encodeURIComponent(thumb)}
                alt={handle || "動画"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-neon-pink/30 blur-3xl" />
                <div className="absolute -right-10 bottom-16 h-56 w-56 rounded-full bg-neon-purple/30 blur-3xl" />
              </div>
            )}
            {/* 再生ボタン＋案内 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-grad shadow-neon">
                <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <span className="text-sm font-bold text-white">タップで再生（音あり）</span>
              {handle && <span className="text-xs text-white/70">@{handle}</span>}
            </div>
          </button>
        )}

        {/* 上部：バッジ（ピックアップ／固定トップのみ） */}
        {showPickupUI && (
          <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
            <span className="badge-pickup">
              <span aria-hidden>✦</span>
              {video.badgeLabel || "今注目"}
            </span>
            {showPr && <span className="label-pr">PR</span>}
          </div>
        )}
      </div>

      {/* 下部：操作UI */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto max-w-[460px]">
          {showPickupUI && video.shopName && (
            <p className="mb-2 text-sm font-bold text-white text-neon">店舗名：{video.shopName}</p>
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
