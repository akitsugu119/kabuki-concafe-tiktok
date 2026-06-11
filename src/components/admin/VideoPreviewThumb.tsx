"use client";

import { useEffect, useRef, useState } from "react";
import { extractTikTokId, resolveShortLink, tiktokPlayerUrl } from "@/lib/tiktok";

/**
 * 管理画面用：動画サムネ＋クリックでその場プレビュー再生（モーダル）。
 * - サムネは画面に入ったときだけ解決（一覧が多くても一斉アクセスしない）
 * - 再生は TikTok 公式プレーヤー（動画ファイルは保存しない）
 */
export default function VideoPreviewThumb({ url }: { url: string }) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(extractTikTokId(url));
  const [open, setOpen] = useState(false);

  // 画面に入ったらサムネ解決
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || thumb) return;
    let cancelled = false;
    resolveShortLink(url).then((r) => {
      if (cancelled || !r) return;
      if (r.thumbnailUrl) setThumb(r.thumbnailUrl);
      if (r.videoId) setVideoId(r.videoId);
    });
    return () => {
      cancelled = true;
    };
  }, [visible, thumb, url]);

  // モーダルを開いたのに動画IDが未解決なら解決を試みる
  useEffect(() => {
    if (!open || videoId) return;
    resolveShortLink(url).then((r) => r?.videoId && setVideoId(r.videoId));
  }, [open, videoId, url]);

  return (
    <>
      <button
        ref={ref}
        onClick={() => setOpen(true)}
        aria-label="動画を確認"
        title="クリックでプレビュー再生"
        className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-800 transition hover:ring-2 hover:ring-neon-pink/60"
      >
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={"/api/thumb?url=" + encodeURIComponent(thumb)}
            alt="動画サムネイル"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 bg-gradient-to-br from-neon-pink/25 to-neon-purple/25" />
        )}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55">
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[380px]"
            onClick={(e) => e.stopPropagation()}
          >
            {videoId ? (
              <iframe
                src={tiktokPlayerUrl(videoId)}
                title="動画プレビュー"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                className="h-[70dvh] w-full rounded-2xl border-0 bg-black"
              />
            ) : (
              <div className="flex h-[70dvh] w-full items-center justify-center rounded-2xl bg-ink-800 text-sm text-white/60">
                読み込み中…
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neon-violet underline"
              >
                TikTokで開く
              </a>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-white/10 px-4 py-1.5 text-xs"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
