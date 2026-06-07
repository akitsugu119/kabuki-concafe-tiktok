"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FilterBar from "./FilterBar";
import VideoCard from "./VideoCard";
import AdCard from "./AdCard";
import { buildFeed, type FeedItem } from "@/lib/feed";
import { getAds, getSettings, getVideos, trackAdView, trackView } from "@/lib/store";
import { useAsyncData } from "@/lib/useStore";
import type { Ad, FeedFilter, Video } from "@/lib/types";

const SEED_KEY = "kabuki.seed.v1";
const FIXEDTOP_KEY = "kabuki.fixedTopShown.v1";

function filterOffset(f: FeedFilter) {
  return f === "all" ? 0 : f === "pickup" ? 101 : 202;
}

export default function VideoFeed() {
  const { data: videos, loading } = useAsyncData<Video[]>(getVideos, []);
  const { data: ads } = useAsyncData<Ad[]>(getAds, []);
  const { data: settings } = useAsyncData<{ adInterval: number }>(getSettings, { adInterval: 0 });
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);

  const seedRef = useRef(0);
  const fixedShownRef = useRef(false);
  const countedKeys = useRef<Set<string>>(new Set());
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // セッションごとのシード＆固定トップ表示済みフラグを初期化
  useEffect(() => {
    let s = Number(sessionStorage.getItem(SEED_KEY));
    if (!s) {
      s = Math.floor(Math.random() * 1e9);
      sessionStorage.setItem(SEED_KEY, String(s));
    }
    seedRef.current = s;
    fixedShownRef.current = sessionStorage.getItem(FIXEDTOP_KEY) === "1";
    setMounted(true);
  }, []);

  const feed: FeedItem[] = useMemo(() => {
    if (!mounted) return [];
    return buildFeed(videos, {
      filter,
      seed: seedRef.current + filterOffset(filter),
      includeFixedTop: filter === "all" && !fixedShownRef.current,
      ads,
      adInterval: settings.adInterval,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, ads, settings, filter, mounted]);

  // 固定トップ枠を実際に挿入したら、セッション内では二度と出さない
  useEffect(() => {
    if (feed.some((i) => i.kind === "video" && i.isFixedTopSlot)) {
      fixedShownRef.current = true;
      sessionStorage.setItem(FIXEDTOP_KEY, "1");
    }
  }, [feed]);

  // フィルター切替時はリストの先頭へ
  useEffect(() => {
    setActiveIndex(0);
    pageRefs.current[0]?.scrollIntoView();
  }, [filter]);

  // 表示中の動画を検知（アクティブ判定＋表示回数計測＋遅延読み込み）
  useEffect(() => {
    if (!mounted || feed.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
            const item = feed[idx];
            if (item && !countedKeys.current.has(item.key)) {
              countedKeys.current.add(item.key);
              if (item.kind === "ad") trackAdView(item.ad.id);
              else trackView(item.video.id);
            }
          }
        });
      },
      { threshold: [0.6] }
    );
    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [mounted, feed]);

  // 矢印ボタンで前後の動画へ移動（iframe がスワイプを吸収する問題の対策）
  const goTo = (delta: number) => {
    const next = Math.min(feed.length - 1, Math.max(0, activeIndex + delta));
    pageRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
    setActiveIndex(next);
  };

  // 動画が終わったら自動で次へ
  const handleEnded = () => goTo(1);

  // 操作ヒント（セッションで1回だけ少し見せる）
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (!mounted) return;
    if (sessionStorage.getItem("kabuki.swipeHint.v1")) return;
    sessionStorage.setItem("kabuki.swipeHint.v1", "1");
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 4500);
    return () => clearTimeout(t);
  }, [mounted]);

  const hasFeed = mounted && feed.length > 0;

  return (
    <>
      <FilterBar value={filter} onChange={setFilter} />

      {/* 音オン/オフ（ブラウザは音アリ自動再生を禁止のため、一度押すと以降スワイプしても音が続く） */}
      {hasFeed && (
        <button
          onClick={() => setSoundOn((s) => !s)}
          aria-label={soundOn ? "音を消す" : "音を出す"}
          className={
            "fixed right-3 top-[calc(env(safe-area-inset-top)+52px)] z-30 flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 text-xs font-bold backdrop-blur-md transition active:scale-95 " +
            (soundOn ? "bg-black/45 text-white" : "bg-accent-grad text-white shadow-neon")
          }
        >
          {soundOn ? "🔊 音オン" : "🔇 タップで音"}
        </button>
      )}

      {/* 前へ／次へ ボタン（左中央に縦並び。TikTok操作ボタンや下部ボタンと重ならない位置）。
          iframe がスワイプを吸収して「どこを触れば次に行くか分からない」問題の対策。 */}
      {hasFeed && (
        <div className="pointer-events-none fixed left-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3">
          <button
            aria-label="前の動画"
            onClick={() => goTo(-1)}
            disabled={activeIndex <= 0}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition active:scale-90 disabled:opacity-25"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-white" fill="none" strokeWidth="2.5">
              <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            aria-label="次の動画"
            onClick={() => goTo(1)}
            disabled={activeIndex >= feed.length - 1}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-grad text-white shadow-neon transition active:scale-90 disabled:opacity-25"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 animate-nudge-y stroke-white"
              fill="none"
              strokeWidth="2.5"
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* 初回の操作ヒント */}
      {hasFeed && showHint && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+200px)] z-30 flex justify-center px-6">
          <div className="animate-fade-up rounded-full bg-black/70 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
上下にスワイプで移動 ／ 右上の「🔇 タップで音」で音が出ます
          </div>
        </div>
      )}

      {!mounted || loading ? (
        <div className="flex h-[100dvh] items-center justify-center">
          <div className="h-10 w-10 animate-pulse rounded-full bg-accent-grad opacity-70" />
        </div>
      ) : feed.length === 0 ? (
        <div className="flex h-[100dvh] items-center justify-center px-8 text-center">
          <p className="text-sm text-white/60">
            この条件で表示できる動画がまだありません。
            <br />
            フィルターを「すべて」に戻してみてください。
          </p>
        </div>
      ) : (
        <div className="swipe-feed">
          {feed.map((item, i) => (
            <div
              key={item.key}
              data-index={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
            >
              {item.kind === "ad" ? (
                <AdCard ad={item.ad} />
              ) : (
                <VideoCard
                  item={item}
                  shouldLoad={Math.abs(i - activeIndex) <= 1}
                  active={i === activeIndex}
                  soundOn={soundOn}
                  onEnded={handleEnded}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
