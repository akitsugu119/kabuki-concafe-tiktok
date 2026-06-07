"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * 右上のメニューボタン＋スライドパネル。
 * 掲載依頼・掲載停止/修正依頼（必須設置：STEP 12）・管理画面への導線をまとめる。
 */
export default function AppMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 右上メニューボタン（動画の邪魔にならない控えめサイズ） */}
      <button
        aria-label="メニュー"
        onClick={() => setOpen(true)}
        className="fixed right-3 top-[max(10px,env(safe-area-inset-top))] z-30 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-white" fill="none" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <nav
            className="absolute right-0 top-0 h-full w-72 max-w-[80%] bg-ink-800 p-5 shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-bold text-white">メニュー</span>
              <button
                aria-label="閉じる"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
              >
                ✕
              </button>
            </div>

            <ul className="flex flex-col gap-1 text-sm">
              <MenuLink href="/" label="トップ（動画を見る）" onClick={() => setOpen(false)} />
              <MenuLink href="/request" label="広告依頼" onClick={() => setOpen(false)} />
              <MenuLink href="/about" label="このサイトについて" onClick={() => setOpen(false)} />
              <li className="my-2 h-px bg-white/10" />
              <MenuLink href="/admin" label="管理画面" onClick={() => setOpen(false)} muted />
            </ul>

            <p className="mt-8 text-[11px] leading-relaxed text-white/40">
              本サイトはTikTok公式埋め込みで動画を表示しています。動画ファイルを保存することはありません。
            </p>
          </nav>
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  label,
  onClick,
  muted,
}: {
  href: string;
  label: string;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={
          "block rounded-xl px-3 py-3 transition hover:bg-white/5 " +
          (muted ? "text-white/55" : "text-white/90")
        }
      >
        {label}
      </Link>
    </li>
  );
}
