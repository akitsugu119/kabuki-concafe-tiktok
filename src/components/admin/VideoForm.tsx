"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Checkbox, Field, TextArea, TextInput } from "@/components/form";
import { deleteVideo, saveVideo } from "@/lib/store";
import { WEIGHT_LABELS, type DisplayWeight, type Video } from "@/lib/types";

function toDateInput(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}
function fromDateInput(d: string) {
  return d ? new Date(d + "T00:00:00.000Z").toISOString() : undefined;
}

const empty = {
  tiktokUrl: "",
  tiktokViewUrl: "",
  isActive: true,
  isPickup: false,
  badgeLabel: "今注目",
  showPrLabel: false,
  shopName: "",
  shopOfficialUrl: "",
  displayWeight: 1 as DisplayWeight,
  isFixedTop: false,
  fixedTopStartDate: "",
  fixedTopEndDate: "",
  adminMemo: "",
};

export default function VideoForm({ initial }: { initial?: Video }) {
  const router = useRouter();
  const [f, setF] = useState({
    tiktokUrl: initial?.tiktokUrl ?? empty.tiktokUrl,
    tiktokViewUrl: initial?.tiktokViewUrl ?? empty.tiktokViewUrl,
    isActive: initial?.isActive ?? empty.isActive,
    isPickup: initial?.isPickup ?? empty.isPickup,
    badgeLabel: initial?.badgeLabel ?? empty.badgeLabel,
    showPrLabel: initial?.showPrLabel ?? empty.showPrLabel,
    shopName: initial?.shopName ?? empty.shopName,
    shopOfficialUrl: initial?.shopOfficialUrl ?? empty.shopOfficialUrl,
    displayWeight: (initial?.displayWeight ?? empty.displayWeight) as DisplayWeight,
    isFixedTop: initial?.isFixedTop ?? empty.isFixedTop,
    fixedTopStartDate: toDateInput(initial?.fixedTopStartDate),
    fixedTopEndDate: toDateInput(initial?.fixedTopEndDate),
    adminMemo: initial?.adminMemo ?? empty.adminMemo,
  });

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await saveVideo({
      id: initial?.id,
      tiktokUrl: f.tiktokUrl,
      tiktokViewUrl: f.tiktokViewUrl || f.tiktokUrl,
      isActive: f.isActive,
      isPickup: f.isPickup,
      badgeLabel: f.badgeLabel || "今注目",
      showPrLabel: f.showPrLabel,
      shopName: f.shopName || undefined,
      shopOfficialUrl: f.shopOfficialUrl || undefined,
      displayWeight: f.displayWeight,
      isFixedTop: f.isFixedTop,
      fixedTopStartDate: fromDateInput(f.fixedTopStartDate),
      fixedTopEndDate: fromDateInput(f.fixedTopEndDate),
      adminMemo: f.adminMemo || undefined,
    });
    router.push("/admin");
    router.refresh();
  };

  const remove = async () => {
    if (initial && confirm("この動画を削除します。よろしいですか？")) {
      setBusy(true);
      await deleteVideo(initial.id);
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* 基本項目 */}
      <fieldset className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-700/40 p-4">
        <legend className="px-2 text-sm font-bold text-neon-rose">基本項目</legend>
        <Field label="TikTok動画URL" required>
          <TextInput
            type="url"
            required
            placeholder="https://www.tiktok.com/@.../video/..."
            value={f.tiktokUrl}
            onChange={(e) => set("tiktokUrl", e.target.value)}
          />
        </Field>
        <Field label="TikTokで見るURL" hint="未入力なら動画URLと同じになります">
          <TextInput
            type="url"
            placeholder="https://..."
            value={f.tiktokViewUrl}
            onChange={(e) => set("tiktokViewUrl", e.target.value)}
          />
        </Field>
        <Checkbox label="表示する（ON/OFF）" checked={f.isActive} onChange={(v) => set("isActive", v)} />
        <Field label="管理用メモ">
          <TextArea
            placeholder="社内用メモ（公開されません）"
            value={f.adminMemo}
            onChange={(e) => set("adminMemo", e.target.value)}
          />
        </Field>
      </fieldset>

      {/* ピックアップ設定 */}
      <fieldset className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-700/40 p-4">
        <legend className="px-2 text-sm font-bold text-neon-rose">ピックアップ設定</legend>
        <Checkbox
          label="ピックアップ（今注目）にする"
          checked={f.isPickup}
          onChange={(v) => set("isPickup", v)}
        />
        <Field label="バッジ名">
          <TextInput value={f.badgeLabel} onChange={(e) => set("badgeLabel", e.target.value)} />
        </Field>
        <Checkbox label="PR表記を出す" checked={f.showPrLabel} onChange={(v) => set("showPrLabel", v)} />
        <Field label="店舗名">
          <TextInput value={f.shopName} onChange={(e) => set("shopName", e.target.value)} />
        </Field>
        <Field label="店舗公式URL">
          <TextInput
            type="url"
            placeholder="https://..."
            value={f.shopOfficialUrl}
            onChange={(e) => set("shopOfficialUrl", e.target.value)}
          />
        </Field>
        <Field label="表示強度">
          <div className="flex gap-2">
            {WEIGHT_LABELS.map((w) => (
              <button
                type="button"
                key={w.value}
                onClick={() => set("displayWeight", w.value)}
                className={
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition " +
                  (f.displayWeight === w.value
                    ? "border-transparent bg-accent-grad text-white"
                    : "border-white/15 bg-ink-600 text-white/70")
                }
              >
                {w.label}
                <span className="ml-1 text-[10px] opacity-60">×{w.value}</span>
              </button>
            ))}
          </div>
        </Field>
      </fieldset>

      {/* 固定トップ設定 */}
      <fieldset className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-700/40 p-4">
        <legend className="px-2 text-sm font-bold text-neon-rose">固定トップ設定</legend>
        <Checkbox
          label="固定トップ枠にする（最初の5本以内に1回表示）"
          checked={f.isFixedTop}
          onChange={(v) => set("isFixedTop", v)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="掲載開始日">
            <TextInput
              type="date"
              value={f.fixedTopStartDate}
              onChange={(e) => set("fixedTopStartDate", e.target.value)}
            />
          </Field>
          <Field label="掲載終了日">
            <TextInput
              type="date"
              value={f.fixedTopEndDate}
              onChange={(e) => set("fixedTopEndDate", e.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <button type="submit" disabled={busy} className="btn-accent w-full py-3.5 text-base disabled:opacity-50">
          {busy ? "保存中..." : initial ? "更新する" : "登録する"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={remove}
            className="w-full rounded-full border border-red-400/40 py-3 text-sm font-bold text-red-300 active:scale-[0.98]"
          >
            この動画を削除
          </button>
        )}
      </div>
    </form>
  );
}
