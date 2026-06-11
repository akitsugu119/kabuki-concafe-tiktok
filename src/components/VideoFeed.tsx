"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  const seedRef = useRef(0);
  const fixedShownRef = useRef(false);
  const countedKeys = useRef<Set<string>>(new Set());
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);
  // ボタン操作中はスクロール検知を一時停止（スムーズスクロール中の誤判定で戻る/飛ぶのを防ぐ）。
  // target に到着するか期限切れまでスクロール検知を無視する。
  const navLockRef = useRef<{ until: number; target: number | null }>({ until: 0, target: null });

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

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const batchRef = useRef(0);

  // 1バッチ分のフィードを生成（バッチ番号で key を一意化）
  const buildBatch = useCallback(
    (batch: number, withFixedTop: boolean): FeedItem[] => {
      const items = buildFeed(videos, {
        filter,
        seed: seedRef.current + filterOffset(filter) + batch * 1000,
        includeFixedTop: withFixedTop,
        ads,
        adInterval: settings.adInterval,
      });
      items.forEach((it) => {
        it.key = `b${batch}-${it.key}`;
      });
      return items;
    },
    [videos, ads, settings, filter]
  );

  // データ/フィルター変更時：最初のバッチを生成
  useEffect(() => {
    if (!mounted) return;
    const first = buildBatch(0, filter === "all" && !fixedShownRef.current);
    batchRef.current = 1;
    countedKeys.current = new Set();
    setActiveIndex(0);
    setFeed(first);
  }, [mounted, buildBatch, filter]);

  // 終わりに近づいたら次のバッチを自動追加（無限スクロール・同じ動画もOK）
  useEffect(() => {
    if (!mounted || feed.length === 0) return;
    if (feed.length >= 600) return; // メモリ保護の上限
    if (activeIndex >= feed.length - 3) {
      const more = buildBatch(batchRef.current, false);
      batchRef.current += 1;
      setFeed((prev) => [...prev, ...more]);
    }
  }, [activeIndex, feed.length, mounted, buildBatch]);

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

  // アクティブ判定：スクロール位置から確実に算出（scroll-snap向け・閾値方式の取りこぼし対策）
  useEffect(() => {
    if (!mounted) return;
    const el = feedRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      const h = el.clientHeight || 1;
      const lock = navLockRef.current;
      if (lock.target !== null) {
        const arrived = Math.abs(el.scrollTop - lock.target * h) < 6;
        if (!arrived && Date.now() < lock.until) return; // 移動中は検知しない
        navLockRef.current = { until: 0, target: null };
      }
      const idx = Math.max(0, Math.min(feed.length - 1, Math.round(el.scrollTop / h)));
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [mounted, feed.length]);

  // 表示回数の計測（アクティブが変わるたびに1回）
  useEffect(() => {
    const item = feed[activeIndex];
    if (!item || countedKeys.current.has(item.key)) return;
    countedKeys.current.add(item.key);
    if (item.kind === "ad") trackAdView(item.ad.id);
    else trackView(item.video.id);
  }, [activeIndex, feed]);

  // 矢印ボタンで前後の動画へ移動（iframe がスワイプを吸収する問題の対策）
  const goTo = (delta: number) => {
    const next = Math.min(feed.length - 1, Math.max(0, activeIndex + delta));
    navLockRef.current = { until: Date.now() + 2000, target: next }; // 到着まで検知を止める
    pageRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
    setActiveIndex(next);
    // スムーズスクロールが途中で止まった場合の保険：未到着なら強制ジャンプ
    window.setTimeout(() => {
      const el = feedRef.current;
      const target = navLockRef.current.target;
      if (!el || target === null) return;
      const h = el.clientHeight || 1;
      if (Math.abs(el.scrollTop - target * h) >= 6)
        el.scrollTo({ top: target * h, behavior: "instant" as ScrollBehavior });
      navLockRef.current = { until: 0, target: null };
    }, 900);
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

      {/* 前へ／次へ ボタン（左中央に縦並び。TikTok操作ボタンや下部ボタンと重ならない位置）。
          iframe がスワイプを吸収して「どこを触れば次に行くか分からない」問題の対策。 */}
      {hasFeed && (
        <div className="pointer-events-none fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-4">
          <button
            aria-label="前の動画"
            onClick={() => goTo(-1)}
            disabled={activeIndex <= 0}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition active:scale-90 disabled:opacity-20"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-white" fill="none" strokeWidth="2.5">
              <path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            aria-label="次の動画"
            onClick={() => goTo(1)}
            disabled={activeIndex >= feed.length - 1}
            className="pointer-events-auto flex flex-col items-center gap-1 disabled:opacity-20"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-grad text-white shadow-neon transition active:scale-90">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 animate-nudge-y stroke-white"
                fill="none"
                strokeWidth="2.5"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-md">
              次へ
            </span>
          </button>
        </div>
      )}

      {/* 初回の操作ヒント */}
      {hasFeed && showHint && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+200px)] z-30 flex justify-center px-6">
          <div className="animate-fade-up rounded-full bg-black/70 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
動画を ▶ タップで再生＋音 ／ 右の「次へ」で切替
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
        <div className="swipe-feed" ref={feedRef}>
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
