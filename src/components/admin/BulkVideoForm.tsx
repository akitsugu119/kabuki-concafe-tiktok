"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { addVideosBulk, getVideos } from "@/lib/store";
import { useAsyncData } from "@/lib/useStore";
import { isTikTokUrl } from "@/lib/tiktok";
import type { Video } from "@/lib/types";

/**
 * 複数のTikTok URLをまとめて登録するフォーム（1行＝1URL）。
 * 各動画は通常動画として作成され、登録後に個別編集でピックアップ等を設定できる。
 */
export default function BulkVideoForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: existingVideos } = useAsyncData<Video[]>(getVideos, []);
  const [result, setResult] = useState<{
    added: number;
    skippedInvalid: number;
    skippedDuplicate: number;
  } | null>(null);

  // 入力プレビュー（登録できる新規URL数 / 無効行 / 重複行）
  // 実際の登録結果と一致するよう、既存URL・入力内の重複も除外して数える。
  const stats = useMemo(() => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const existing = new Set(existingVideos.map((v) => v.tiktokUrl.trim()));
    const seen = new Set<string>();
    let invalid = 0;
    let duplicate = 0;
    let valid = 0;
    for (const l of lines) {
      if (!isTikTokUrl(l)) {
        invalid++;
        continue;
      }
      if (existing.has(l) || seen.has(l)) {
        duplicate++;
        continue;
      }
      seen.add(l);
      valid++;
    }
    return { total: lines.length, valid, invalid, duplicate };
  }, [text, existingVideos]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const urls = text.split(/\r?\n/);
    const r = await addVideosBulk(urls);
    setBusy(false);
    setResult(r);
    if (r.added > 0) {
      // 少し結果を見せてから一覧へ
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1200);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-ink-700/40 p-4">
        <label className="mb-2 block text-sm font-bold text-white/90">
          TikTok動画URL（1行に1つ）
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            "https://www.tiktok.com/@.../video/...\nhttps://vt.tiktok.com/XXXXXXXX/\nhttps://vt.tiktok.com/YYYYYYYY/"
          }
          className="min-h-[220px] w-full resize-y rounded-xl border border-white/15 bg-ink-700 px-4 py-3 font-mono text-xs leading-relaxed text-white placeholder-white/30 outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30"
        />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
          <span>
            登録できるURL：<span className="font-bold text-neon-rose">{stats.valid}</span> 件
          </span>
          {stats.duplicate > 0 && (
            <span className="text-white/40">重複：{stats.duplicate} 件（スキップ）</span>
          )}
          {stats.invalid > 0 && (
            <span className="text-white/40">TikTok以外の行：{stats.invalid} 件（スキップ）</span>
          )}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-white/45">
        ・短縮URL（vt.tiktok.com/...）・通常URLどちらもOKです。
        <br />
        ・各動画は「通常動画・表示ON」で登録されます。ピックアップ／固定トップ／店舗情報は登録後に個別編集してください。
        <br />
        ・すでに登録済みのURL・重複行は自動でスキップします。
      </p>

      {result && (
        <div className="rounded-xl border border-neon-purple/40 bg-ink-700 p-4 text-sm text-white/90">
          <p className="font-bold text-neon-rose">{result.added} 件を登録しました。</p>
          {(result.skippedInvalid > 0 || result.skippedDuplicate > 0) && (
            <p className="mt-1 text-xs text-white/55">
              スキップ：無効 {result.skippedInvalid} 件 / 重複 {result.skippedDuplicate} 件
            </p>
          )}
          {result.added > 0 && <p className="mt-1 text-xs text-white/45">一覧に戻ります…</p>}
        </div>
      )}

      <button
        type="submit"
        disabled={stats.valid === 0 || busy}
        className="btn-accent w-full py-3.5 text-base disabled:opacity-40"
      >
        {busy
          ? "登録中..."
          : stats.valid > 0
            ? `${stats.valid} 件をまとめて登録`
            : "URLを入力してください"}
      </button>
    </form>
  );
}
