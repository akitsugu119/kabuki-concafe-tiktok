"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "kabuki.introShown.v1";

type Phase = "hidden" | "show" | "closing";

/**
 * 初回表示時だけアプリ名とサブコピーを自然に見せる（STEP 4 / STEP 14）。
 * 数秒でフェードアウトし、以降は動画体験を邪魔しない。
 *
 * タイマーは phase に紐づく別 effect に分離している。
 * （StrictMode の二重実行で cleanup がタイマーを消しても、
 *  最終マウントで必ず張り直されるようにするため）
 */
export default function IntroOverlay() {
  const [phase, setPhase] = useState<Phase>("hidden");

  // 表示するかどうかの判定（セッションで1回だけ）
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setPhase("show");
  }, []);

  // 表示 → フェード開始（各ステージが自分のタイマーを持つので、
  // phase 遷移で片方のタイマーが消えてしまう問題が起きない）
  useEffect(() => {
    if (phase !== "show") return;
    const t = setTimeout(() => setPhase("closing"), 2600);
    return () => clearTimeout(t);
  }, [phase]);

  // フェード完了 → 非表示
  useEffect(() => {
    if (phase !== "closing") return;
    const t = setTimeout(() => setPhase("hidden"), 800);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={
        "pointer-events-none fixed inset-0 z-40 flex flex-col items-center justify-center bg-ink-900/80 backdrop-blur-sm transition-opacity duration-700 " +
        (phase === "closing" ? "opacity-0" : "opacity-100")
      }
    >
      <div className="animate-fade-up px-8 text-center">
        <p className="mb-3 text-xs tracking-widest text-neon-violet">KABUKI CONCAFE</p>
        <h1 className="text-2xl font-bold leading-snug text-white text-neon">
          かぶきコンカフェ嬢
          <br />
          TikTokまとめ
        </h1>
        <p className="mt-4 text-sm text-white/75">
          歌舞伎町コンカフェ嬢のTikTokを、
          <br />
          スワイプでまとめ見。
        </p>
        <p className="mt-6 text-xs text-white/40">▲ 上下スワイプで動画を見る</p>
      </div>
    </div>
  );
}
