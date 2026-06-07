"use client";

import Link from "next/link";
import { useState } from "react";
import { adminLogout } from "@/components/admin/AdminGate";
import AdsManager from "@/components/admin/AdsManager";
import {
  getPublishRequests,
  getVideos,
  patchVideo,
  setPublishRequestStatus,
} from "@/lib/store";
import { useAsyncData } from "@/lib/useStore";
import { extractHandle } from "@/lib/tiktok";
import { type PublishRequest, type Video } from "@/lib/types";

type Tab = "videos" | "report" | "publish" | "ads";

export default function AdminDashboard() {
  const { data: videos, refresh: refreshVideos } = useAsyncData<Video[]>(getVideos, []);
  const { data: publishReqs, refresh: refreshReqs } = useAsyncData<PublishRequest[]>(
    getPublishRequests,
    []
  );
  const [tab, setTab] = useState<Tab>("videos");

  const newPublish = publishReqs.filter((r) => r.status === "new").length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-24">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">管理画面</h1>
          <p className="text-xs text-white/45">かぶきコンカフェ嬢TikTokまとめ</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/new" className="btn-accent px-4 py-2 text-xs">
            ＋ 新規登録
          </Link>
          <button
            onClick={adminLogout}
            className="rounded-full border border-white/15 px-3 py-2 text-xs text-white/70"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* タブ */}
      <div className="mb-5 flex flex-wrap gap-2 text-xs">
        <TabBtn active={tab === "videos"} onClick={() => setTab("videos")}>
          動画一覧（{videos.length}）
        </TabBtn>
        <TabBtn active={tab === "report"} onClick={() => setTab("report")}>
          レポート
        </TabBtn>
        <TabBtn active={tab === "ads"} onClick={() => setTab("ads")}>
          広告バナー
        </TabBtn>
        <TabBtn active={tab === "publish"} onClick={() => setTab("publish")}>
          広告依頼{newPublish > 0 && <Dot>{newPublish}</Dot>}
        </TabBtn>
      </div>

      {tab === "videos" && <VideosTab videos={videos} onChange={refreshVideos} />}
      {tab === "report" && <ReportTab videos={videos} />}
      {tab === "ads" && <AdsManager />}
      {tab === "publish" && <PublishTab reqs={publishReqs} onChange={refreshReqs} />}
    </div>
  );
}

// ============================ 動画一覧（STEP 9）============================
function VideosTab({ videos, onChange }: { videos: Video[]; onChange: () => void }) {
  const toggle = async (
    id: string,
    patch: Partial<Pick<Video, "isActive" | "isPickup" | "isFixedTop">>
  ) => {
    await patchVideo(id, patch);
    onChange();
  };
  return (
    <div className="flex flex-col gap-3">
      {videos.length === 0 && <Empty>動画がまだありません。「＋ 新規登録」から追加できます。</Empty>}
      {videos.map((v) => (
        <div
          key={v.id}
          className="rounded-2xl border border-white/10 bg-ink-700/40 p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">
                {v.shopName || (extractHandle(v.tiktokUrl) ? "@" + extractHandle(v.tiktokUrl) : "（店舗名なし）")}
              </p>
              <p className="truncate text-[11px] text-white/40">{v.tiktokUrl}</p>
              {v.adminMemo && <p className="mt-1 text-[11px] text-neon-violet">📝 {v.adminMemo}</p>}
            </div>
            <Link
              href={`/admin/${v.id}`}
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs"
            >
              編集
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <Toggle
              on={v.isActive}
              onLabel="表示ON"
              offLabel="表示OFF"
              onClick={() => toggle(v.id, { isActive: !v.isActive })}
            />
            <Toggle
              on={v.isPickup}
              onLabel="ピックアップ"
              offLabel="ピックアップ"
              onClick={() => toggle(v.id, { isPickup: !v.isPickup })}
            />
            <Toggle
              on={v.isFixedTop}
              onLabel="固定トップ"
              offLabel="固定トップ"
              onClick={() => toggle(v.id, { isFixedTop: !v.isFixedTop })}
            />
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/55">
              強度 ×{v.displayWeight}
            </span>
          </div>

          <div className="mt-3 flex gap-4 text-[11px] text-white/55">
            <span>👁 {v.viewCount}</span>
            <span>▶ {v.tiktokClickCount}</span>
            <span>🏬 {v.shopClickCount}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================ レポート（STEP 10）============================
function ReportTab({ videos }: { videos: Video[] }) {
  const ctr = (clicks: number, views: number) =>
    views === 0 ? "0%" : `${Math.round((clicks / views) * 100)}%`;

  // 店舗別の簡易集計
  const byShop = new Map<string, { views: number; shopClicks: number; tiktokClicks: number }>();
  videos.forEach((v) => {
    if (!v.shopName) return;
    const cur = byShop.get(v.shopName) ?? { views: 0, shopClicks: 0, tiktokClicks: 0 };
    cur.views += v.viewCount;
    cur.shopClicks += v.shopClickCount;
    cur.tiktokClicks += v.tiktokClickCount;
    byShop.set(v.shopName, cur);
  });

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-bold">動画別</h2>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-ink-700 text-white/60">
              <tr>
                <th className="p-3">動画</th>
                <th className="p-3 text-right">表示</th>
                <th className="p-3 text-right">TikTok</th>
                <th className="p-3 text-right">店舗</th>
                <th className="p-3 text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-t border-white/5">
                  <td className="max-w-[160px] truncate p-3">
                    {v.shopName || "@" + (extractHandle(v.tiktokUrl) ?? "—")}
                  </td>
                  <td className="p-3 text-right">{v.viewCount}</td>
                  <td className="p-3 text-right">{v.tiktokClickCount}</td>
                  <td className="p-3 text-right">{v.shopClickCount}</td>
                  <td className="p-3 text-right text-neon-rose">
                    {ctr(v.tiktokClickCount + v.shopClickCount, v.viewCount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold">店舗別（広告レポート用）</h2>
        {byShop.size === 0 ? (
          <Empty>店舗名が登録された動画がありません。</Empty>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-ink-700 text-white/60">
                <tr>
                  <th className="p-3">店舗</th>
                  <th className="p-3 text-right">表示</th>
                  <th className="p-3 text-right">店舗クリック</th>
                  <th className="p-3 text-right">店舗CTR</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byShop.entries()).map(([shop, s]) => (
                  <tr key={shop} className="border-t border-white/5">
                    <td className="p-3">{shop}</td>
                    <td className="p-3 text-right">{s.views}</td>
                    <td className="p-3 text-right">{s.shopClicks}</td>
                    <td className="p-3 text-right text-neon-rose">{ctr(s.shopClicks, s.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================ 広告依頼（STEP 11）============================
function PublishTab({ reqs, onChange }: { reqs: PublishRequest[]; onChange: () => void }) {
  if (reqs.length === 0) return <Empty>広告依頼はまだありません。</Empty>;
  return (
    <div className="flex flex-col gap-3">
      {reqs.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 bg-ink-700/40 p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <StatusPill status={r.status} />
            <span className="text-[11px] text-white/40">
              {new Date(r.createdAt).toLocaleString("ja-JP")}
            </span>
          </div>
          <Row k="動画URL" v={r.tiktokUrl} />
          <Row k="店舗名" v={r.shopName || "—"} />
          <Row k="店舗URL" v={r.shopOfficialUrl || "—"} />
          <Row k="連絡先" v={r.contact} />
          <Row k="今注目枠希望" v={r.wantPickup ? "あり" : "なし"} />
          {r.message && <Row k="メッセージ" v={r.message} />}
          {r.status === "new" && (
            <button
              onClick={async () => {
                await setPublishRequestStatus(r.id, "done");
                onChange();
              }}
              className="mt-3 rounded-full bg-white/10 px-3 py-1.5 text-xs"
            >
              対応済みにする
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================ 小物 ============================
function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1 rounded-full px-3.5 py-2 font-bold transition " +
        (active ? "bg-accent-grad text-white" : "bg-white/8 text-white/65")
      }
    >
      {children}
    </button>
  );
}
function Dot({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-pink px-1 text-[10px] text-white">
      {children}
    </span>
  );
}
function Toggle({
  on,
  onLabel,
  offLabel,
  onClick,
}: {
  on: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full px-2.5 py-1 text-[11px] font-bold transition " +
        (on
          ? "bg-accent-grad text-white"
          : "bg-white/8 text-white/40 line-through")
      }
    >
      {on ? onLabel : offLabel}
    </button>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex gap-2 py-0.5 text-xs">
      <span className="shrink-0 text-white/45">{k}：</span>
      <span className="break-all text-white/85">{v}</span>
    </p>
  );
}
function StatusPill({ status }: { status: "new" | "done" }) {
  return status === "new" ? (
    <span className="rounded-full bg-neon-purple/25 px-2.5 py-1 text-[11px] font-bold text-neon-violet">
      未対応
    </span>
  ) : (
    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/50">対応済み</span>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-700/30 p-8 text-center text-sm text-white/45">
      {children}
    </div>
  );
}
