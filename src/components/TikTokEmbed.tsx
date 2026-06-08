"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  extractHandle,
  extractTikTokId,
  isPlaceholderId,
  isShortLink,
  resolveShortLink,
  tiktokPlayerUrl,
} from "@/lib/tiktok";

interface Props {
  url: string;
  /** true のときだけ iframe を読み込む（前後の動画のみ：パフォーマンス対策） */
  shouldLoad: boolean;
  /** 今まさに画面に出ている動画か（自動再生の対象） */
  active: boolean;
  /** 動画が最後まで再生し終わったとき */
  onEnded?: () => void;
}

/**
 * TikTok 公式プレーヤー（player/v1）。
 * - active のものだけ再生、それ以外は一時停止＋ミュート（前の音が残る問題の対策）
 * - soundOn なら unMute（要・事前のユーザー操作）
 * - 再生終了(onStateChange=0)で onEnded を呼ぶ（自動で次へ）
 */
export default function TikTokEmbed({ url, shouldLoad, active, onEnded }: Props) {
  const directId = extractTikTokId(url);
  const short = isShortLink(url);

  const [resolvedId, setResolvedId] = useState<string | null>(directId);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [playing, setPlaying] = useState(false);
  const [showTap, setShowTap] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const activeRef = useRef(active);
  const onEndedRef = useRef(onEnded);
  activeRef.current = active;
  onEndedRef.current = onEnded;

  // 短縮URLの解決
  useEffect(() => {
    if (directId || resolvedId) return;
    if (!short || !shouldLoad) return;
    let cancelled = false;
    setStatus("loading");
    resolveShortLink(url)
      .then((res) => {
        if (cancelled) return;
        if (res?.videoId) {
          setResolvedId(res.videoId);
          setStatus("idle");
        } else setStatus("error");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => {
      cancelled = true;
    };
  }, [url, short, directId, resolvedId, shouldLoad]);

  // プレーヤーへコマンド送信
  const post = useCallback((type: string, value?: number) => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    const msg =
      value === undefined
        ? { "x-tiktok-player": true, type }
        : { "x-tiktok-player": true, type, value };
    w.postMessage(msg, "*");
  }, []);

  // active なら再生（soundOn のときは音オンも送る＝PCで一度操作後は音が続く）。
  // 非アクティブは一時停止。soundOff のときは何もせず（ミュート自動再生のまま）。
  const applyState = useCallback(() => {
    if (activeRef.current) {
      post("play");
    } else {
      post("pause");
      post("mute");
    }
  }, [post]);

  // プレーヤーからのイベント受信（このiframe由来のみ）
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const w = iframeRef.current?.contentWindow;
      if (!w || e.source !== w) return;
      let data: unknown = e.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== "object") return;
      const d = data as { type?: string; value?: number };
      if (d.type === "onPlayerReady") {
        readyRef.current = true;
        applyState();
      } else if (d.type === "onStateChange") {
        if (d.value === 1) setPlaying(true); // playing
        else if (d.value === 2) setPlaying(false); // paused
        else if (d.value === 0) {
          // ended
          setPlaying(false);
          if (activeRef.current) onEndedRef.current?.();
        }
      } else if (d.type === "onCurrentTime") {
        setPlaying(true);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [applyState]);

  // active が変わったら反映。読み込みが間に合わない場合に備えて少し遅れて再送。
  useEffect(() => {
    applyState();
    const t1 = setTimeout(() => activeRef.current && applyState(), 400);
    const t2 = setTimeout(() => activeRef.current && applyState(), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, applyState]);

  // 自動再生されない端末向け：active なのに一定時間 再生されなければ「タップで再生」を出す
  useEffect(() => {
    if (!active || playing) {
      setShowTap(false);
      return;
    }
    const t = setTimeout(() => setShowTap(true), 1800);
    return () => clearTimeout(t);
  }, [active, playing]);

  // タップで確実に再生＋音オン（ユーザー操作なのでブラウザが許可する）
  const onTapPlay = useCallback(() => {
    post("play");
    post("unMute");
    setShowTap(false);
  }, [post]);

  // ---- 表示分岐 ----
  if (directId && isPlaceholderId(directId)) return <DemoCard url={url} />;
  if ((!resolvedId && !short) || status === "error") return <ErrorCard />;
  if (!resolvedId) return <PosterCard loading={status === "loading"} />;
  if (!shouldLoad) return <PosterCard loading={false} />;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        ref={iframeRef}
        src={tiktokPlayerUrl(resolvedId)}
        title="TikTok 動画"
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        onError={() => setStatus("error")}
        className="h-full w-full border-0"
      />
      {showTap && (
        <button
          onClick={onTapPlay}
          aria-label="タップで再生"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-grad shadow-neon">
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-white">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-sm font-bold text-white">タップで再生</span>
          <span className="text-[11px] text-white/70">▶ 後、動画内の 🔈 で音が出ます</span>
        </button>
      )}
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
