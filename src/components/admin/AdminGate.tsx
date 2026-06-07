"use client";

import { useEffect, useState } from "react";
import { adminLogin, clearAdminKey, getAdminKey, setAdminKey } from "@/lib/store";

/**
 * 管理画面ゲート。パスコードをサーバー(ADMIN_SECRET)と照合し、
 * 合致したらキーを localStorage に保存して以降の管理APIに付与する。
 */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUnlocked(!!getAdminKey());
    setReady(true);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const ok = await adminLogin(input);
    setBusy(false);
    if (ok) {
      setAdminKey(input);
      setUnlocked(true);
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
          <button type="submit" disabled={busy} className="btn-accent mt-4 w-full disabled:opacity-50">
            {busy ? "確認中..." : "ログイン"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

export function adminLogout() {
  clearAdminKey();
  location.href = "/admin";
}
