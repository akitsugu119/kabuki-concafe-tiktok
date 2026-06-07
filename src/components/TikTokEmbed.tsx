"use client";

import { useEffect, useState } from "react";
import {
  extractHandle,
  extractTikTokId,
  isPlaceholderId,
  isShortLink,
  resolveShortLink,
  tiktokEmbedUrl,
} from "@/lib/tiktok";

interface Props {
  url: string;
  /** true のときだけ実際に読み込む（前後の動画のみ：STEP 5 のパフォーマンス対策） */
  shouldLoad: boolean;
}

/**
 * TikTok 公式埋め込み（iframe）。
 * - URLに数値IDがある → そのまま埋め込み
 * - 短縮URL（vt.tiktok.com/...）→ /api/resolve で oEmbed 解決してから埋め込み
 * - 仮ID（サンプル）→ デモカード
 * - 解決不可・埋め込み不可 → エラー表示
 */
export default function TikTokEmbed({ url, shouldLoad }: Props) {
  const directId = extractTikTokId(url);
  const short = isShortLink(url);

  const [resolvedId, setResolvedId] = useState<string | null>(directId);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (directId || resolvedId) return; // すでにID確定
    if (!short) return; // 短縮でもなくIDも無い → 後段でエラー
    if (!shouldLoad) return; // 遅延読み込み

    let cancelled = false;
    setStatus("loading");
    resolveShortLink(url)
      .then((res) => {
        if (cancelled) return;
        if (res?.videoId) {
          setResolvedId(res.videoId);
          setStatus("idle");
        } else {
          setStatus("error");
        }
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
  }, [url, short, directId, resolvedId, shouldLoad]);

  // 仮ID（サンプルの連番）→ デモカード
  if (directId && isPlaceholderId(directId)) {
    return <DemoCard url={url} />;
  }

  // ID取得不可（短縮でもない不正URL or 解決失敗）→ エラー
  if ((!resolvedId && !short) || status === "error") {
    return <ErrorCard />;
  }

  // まだ読み込みタイミングでない／解決中 → 軽量プレースホルダ
  if (!resolvedId) {
    return <PosterCard loading={status === "loading"} />;
  }

  if (!shouldLoad) {
    return <PosterCard loading={false} />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        src={tiktokEmbedUrl(resolvedId)}
        title="TikTok 動画"
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        onError={() => setStatus("error")}
        className="h-full w-full border-0"
      />
    </div>
  );
}

function PosterCard({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-ink-800">
      <div
        className={
          "h-10 w-10 rounded-full bg-accent-grad opacity-70 " + (loading ? "animate-pulse" : "")
        }
      />
    </div>
  );
}

function ErrorCard() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl bg-ink-800 px-6 text-center">
      <div className="text-3xl">🥀</div>
      <p className="text-sm text-white/70">この動画は現在表示できません</p>
    </div>
  );
}

function DemoCard({ url }: { url: string }) {
  const handle = extractHandle(url);
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-ink-800">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-neon-pink/30 blur-3xl" />
        <div className="absolute -right-10 bottom-16 h-56 w-56 rounded-full bg-neon-purple/30 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neon-blue/20 blur-3xl" />
      </div>
      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {handle && <p className="text-base font-bold text-white/90">@{handle}</p>}
        <p className="text-xs text-white/50">TikTok 動画（デモ表示）</p>
      </div>
    </div>
  );
}
