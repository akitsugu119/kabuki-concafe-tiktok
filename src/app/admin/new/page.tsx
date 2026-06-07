"use client";

import Link from "next/link";
import { useState } from "react";
import BulkVideoForm from "@/components/admin/BulkVideoForm";
import VideoForm from "@/components/admin/VideoForm";

type Mode = "single" | "bulk";

export default function NewVideoPage() {
  const [mode, setMode] = useState<Mode>("single");

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-24">
      <header className="mb-5 flex items-center gap-3">
        <Link
          href="/admin"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
          aria-label="戻る"
        >
          ←
        </Link>
        <h1 className="text-lg font-bold">動画を登録</h1>
      </header>

      {/* 登録モード切替 */}
      <div className="mb-5 flex gap-2 rounded-full border border-white/10 bg-ink-700/50 p-1 text-sm">
        <button
          onClick={() => setMode("single")}
          className={
            "flex-1 rounded-full py-2 font-bold transition " +
            (mode === "single" ? "bg-accent-grad text-white" : "text-white/60")
          }
        >
          1件ずつ詳細登録
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={
            "flex-1 rounded-full py-2 font-bold transition " +
            (mode === "bulk" ? "bg-accent-grad text-white" : "text-white/60")
          }
        >
          複数まとめて登録
        </button>
      </div>

      {mode === "single" ? <VideoForm /> : <BulkVideoForm />}
    </div>
  );
}
