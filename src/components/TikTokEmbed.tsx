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
  /** true のときだけ iframe を読み込む（前後の動画：先読み） */
  shouldLoad: boolean;
  /** 今まさに画面に出ている動画か */
  active: boolean;
  /** 再生が最後まで終わったとき */
  onEnded?: () => void;
}

/**
 * TikTok 公式プレーヤー（player/v1）。
 * - 自動再生はしない。ユーザーがプレーヤー内の再生ボタンを押すと「音アリ」で再生される。
 *   （クロスオリジンの埋め込みでは、音アリ再生は iframe 内の操作でのみブラウザが許可するため、
 *    親側からの unMute は無音になる。だから“ネイティブの再生ボタンを直接タップ”が最短。）
 * - 非アクティブは pause+mute（前の動画の音が残らないように）。
 * - 再生終了(onStateChange=0)で onEnded を呼ぶ（自動で次へ）。
 */
export default function TikTokEmbed({ url, shouldLoad, active, onEnded }: Props) {
  const directId = extractTikTokId(url);
  const short = isShortLink(url);

  const [resolvedId, setResolvedId] = useState<string | null>(directId);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const activeRef = useRef(active);
  const onEndedRef = useRef(onEnded);
  readyRef.current = ready;
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
  const post = useCallback((type: string) => {
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    w.postMessage({ "x-tiktok-player": true, type }, "*");
  }, []);

  // 非アクティブは停止＋ミュート。アクティブは何もしない（ユーザー操作で音アリ再生させる）。
  const applyState = useCallback(() => {
    if (!activeRef.current) {
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
        setReady(true);
        applyState();
      } else if (d.type === "onStateChange") {
        if (d.value === 0 && activeRef.current) onEndedRef.current?.(); // ended → 次へ
      } else if (d.type === "onPlayerError") {
        setStatus("error");
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [applyState]);

  // active 変化を反映（非アクティブの停止・ミュートを確実に。読み込み遅延に備え再送）
  useEffect(() => {
    applyState();
    const t1 = setTimeout(applyState, 400);
    const t2 = setTimeout(applyState, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active, applyState]);

  // 再読み込み時は準備状態をリセット
  useEffect(() => {
    setReady(false);
  }, [reloadKey]);

  // 黒いまま読み込めない対策：active なのに5秒たっても準備完了しなければ自動再読み込み（1回）
  useEffect(() => {
    if (!active || ready || reloadKey >= 1) return;
    const t = setTimeout(() => {
      if (activeRef.current && !readyRef.current) setReloadKey((k) => k + 1);
    }, 5000);
    return () => clearTimeout(t);
  }, [active, ready, reloadKey]);

  // 再読み込みしても準備できなければエラー表示にする（無限ローディング回避）
  useEffect(() => {
    if (!active || ready || reloadKey < 1) return;
    const t = setTimeout(() => {
      if (activeRef.current && !readyRef.current) setStatus("error");
    }, 5000);
    return () => clearTimeout(t);
  }, [active, ready, reloadKey]);

  // ---- 表示分岐 ----
  if (directId && isPlaceholderId(directId)) return <DemoCard url={url} />;
  if ((!resolvedId && !short) || status === "error") return <ErrorCard />;
  if (!resolvedId) return <PosterCard loading={status === "loading"} />;
  if (!shouldLoad) return <PosterCard loading={false} />;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-black">
      <iframe
        key={reloadKey}
        ref={iframeRef}
        src={tiktokPlayerUrl(resolvedId)}
        title="TikTok 動画"
        loading="lazy"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        onError={() => setStatus("error")}
        className="h-full w-full border-0"
      />
      {/* 読み込み中だけスピナー（pointer-events-none で下のプレーヤー操作を邪魔しない） */}
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-800">
          <div className="h-10 w-10 animate-pulse rounded-full bg-accent-grad opacity-70" />
        </div>
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
      <p className="text-xs text-white/40">↑ 上にスワイプで次の動画へ</p>
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
