"use client";

import { useEffect, useState } from "react";

// 簡易パスコード（MVP用）。実運用では Supabase Auth 等に置き換える。
const PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "kabuki2026";
const KEY = "kabuki.admin.v1";

/**
 * 管理画面の簡易ゲート。
 * ⚠️ クライアント側のみの簡易認証なので、本番では必ずサーバー認証に置き換えること。
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setUnlocked(localStorage.getItem(KEY) === "1");
    setReady(true);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSCODE) {
      localStorage.setItem(KEY, "1");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (!ready) return null;

  if (!unlocked) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-ink-900 px-6">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-700 p-6"
        >
          <h1 className="mb-1 text-lg font-bold text-white">管理画面ログイン</h1>
          <p className="mb-5 text-xs text-white/50">パスコードを入力してください</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="パスコード"
            className="w-full rounded-xl border border-white/15 bg-ink-600 px-4 py-3 text-sm text-white outline-none focus:border-neon-purple"
            autoFocus
          />
          {error && <p className="mt-2 text-xs text-neon-pink">パスコードが違います</p>}
          <button type="submit" className="btn-accent mt-4 w-full">
            ログイン
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

export function adminLogout() {
  localStorage.removeItem(KEY);
  location.href = "/admin";
}
