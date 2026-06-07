"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import VideoForm from "@/components/admin/VideoForm";
import { getVideos } from "@/lib/store";
import { useAsyncData } from "@/lib/useStore";
import type { Video } from "@/lib/types";

export default function EditVideoPage() {
  const params = useParams();
  const id = String(params.id);
  const { data: videos, loading } = useAsyncData<Video[]>(getVideos, []);
  const video = videos.find((v) => v.id === id);

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
        <h1 className="text-lg font-bold">動画を編集</h1>
      </header>

      {loading ? (
        <p className="p-8 text-center text-sm text-white/40">読み込み中…</p>
      ) : video ? (
        <VideoForm initial={video} />
      ) : (
        <p className="rounded-2xl border border-white/10 bg-ink-700/30 p-8 text-center text-sm text-white/50">
          動画が見つかりませんでした。
        </p>
      )}
    </div>
  );
}
