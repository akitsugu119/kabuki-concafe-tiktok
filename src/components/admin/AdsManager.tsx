"use client";

import { useState } from "react";
import { Field, TextInput } from "@/components/form";
import {
  adImageUrl,
  createAd,
  deleteAd,
  getAdsAdmin,
  getSettings,
  setAdInterval,
  toggleAd,
} from "@/lib/store";
import { useAsyncData } from "@/lib/useStore";
import type { Ad } from "@/lib/types";

export default function AdsManager() {
  const { data: ads, refresh } = useAsyncData<Ad[]>(getAdsAdmin, []);
  const { data: settings, refresh: refreshSettings } = useAsyncData<{ adInterval: number }>(
    getSettings,
    { adInterval: 7 }
  );

  return (
    <div className="flex flex-col gap-6">
      <IntervalSetting key={settings.adInterval} current={settings.adInterval} onSaved={refreshSettings} />
      <NewAdForm onCreated={refresh} />
      <AdList ads={ads} onChange={refresh} />
    </div>
  );
}

// ---- 表示間隔の設定 --------------------------------------------
function IntervalSetting({ current, onSaved }: { current: number; onSaved: () => void }) {
  const [val, setVal] = useState<string>(String(current));
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await setAdInterval(Number(val) || 0);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-ink-700/40 p-4">
      <h2 className="mb-1 text-sm font-bold text-neon-rose">広告の表示間隔</h2>
      <p className="mb-3 text-xs text-white/50">
        通常動画 何本ごとに広告を1回はさむか。<b>0</b> にすると広告オフ。現在: 約{current}本ごと
      </p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white/70">動画</span>
        <input
          type="number"
          min={0}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-20 rounded-xl border border-white/15 bg-ink-700 px-3 py-2 text-center text-sm text-white outline-none focus:border-neon-purple"
        />
        <span className="text-sm text-white/70">本ごとに広告</span>
        <button onClick={save} className="btn-accent ml-auto px-4 py-2 text-xs">
          保存
        </button>
      </div>
      {saved && <p className="mt-2 text-xs text-neon-rose">保存しました</p>}
    </section>
  );
}

// ---- 新規広告の登録 --------------------------------------------
function NewAdForm({ onCreated }: { onCreated: () => void }) {
  const [label, setLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageMime, setImageMime] = useState("");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("画像は2MB以下にしてください");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const comma = dataUrl.indexOf(",");
      const meta = dataUrl.slice(0, comma);
      const b64 = dataUrl.slice(comma + 1);
      const mime = meta.match(/data:(.*?);base64/)?.[1] || file.type || "image/jpeg";
      setImageData(b64);
      setImageMime(mime);
      setPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageData || !linkUrl) {
      setError("画像と飛び先URLは必須です");
      return;
    }
    setBusy(true);
    const r = await createAd({ label, linkUrl, imageData, imageMime });
    setBusy(false);
    if (r.ok) {
      setLabel("");
      setLinkUrl("");
      setImageData("");
      setPreview("");
      setError("");
      onCreated();
    } else {
      setError(r.error || "登録に失敗しました");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink-700/40 p-4"
    >
      <h2 className="text-sm font-bold text-neon-rose">広告を追加（画像バナー）</h2>

      <div className="rounded-xl border border-white/10 bg-ink-700/60 p-3 text-[11px] leading-relaxed text-white/60">
        <p className="mb-1 font-bold text-white/80">📐 推奨サイズ</p>
        ・<b className="text-white/80">縦長 9:16</b>（推奨 1080×1920px ／ 最低 720×1280px）<br />
        ・形式：JPG または PNG ／ 容量：2MBまで（軽さ重視なら〜500KB）<br />
        ・大事な文字・ロゴは<b className="text-white/80">中央寄せ</b>に。
        左上（「広告 PR」表記）と画面下（ボタン）に重ならないよう、上下の端は余白を取ると安全
      </div>

      <Field label="広告画像" required hint="9:16 縦長推奨・2MBまで（JPG/PNG）">
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          className="block w-full text-xs text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-accent-grad file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
        />
      </Field>

      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="プレビュー"
          className="max-h-60 w-auto self-start rounded-xl border border-white/10"
        />
      )}

      <Field label="飛び先URL" required>
        <TextInput
          type="url"
          placeholder="https://..."
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
      </Field>

      <Field label="ラベル（任意）" hint="広告主名など。画面下に小さく表示">
        <TextInput
          placeholder="例）〇〇店 / キャンペーン名"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </Field>

      {error && <p className="text-xs text-neon-pink">{error}</p>}

      <button type="submit" disabled={busy} className="btn-accent w-full disabled:opacity-50">
        {busy ? "登録中..." : "広告を登録"}
      </button>
    </form>
  );
}

// ---- 広告一覧 --------------------------------------------------
function AdList({ ads, onChange }: { ads: Ad[]; onChange: () => void }) {
  if (ads.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-ink-700/30 p-8 text-center text-sm text-white/45">
        広告はまだありません。上のフォームから追加できます。
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold">登録済みの広告（{ads.length}）</h2>
      {ads.map((ad) => (
        <div
          key={ad.id}
          className="flex gap-3 rounded-2xl border border-white/10 bg-ink-700/40 p-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={adImageUrl(ad.id)}
            alt={ad.label || "広告"}
            className="h-24 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{ad.label || "（ラベルなし）"}</p>
            <p className="truncate text-[11px] text-white/40">{ad.linkUrl}</p>
            <div className="mt-1 flex gap-3 text-[11px] text-white/55">
              <span>👁 {ad.viewCount}</span>
              <span>👆 {ad.clickCount}</span>
              <span className="text-neon-rose">
                CTR {ad.viewCount ? Math.round((ad.clickCount / ad.viewCount) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={async () => {
                  await toggleAd(ad.id, !ad.isActive);
                  onChange();
                }}
                className={
                  "rounded-full px-2.5 py-1 text-[11px] font-bold transition " +
                  (ad.isActive ? "bg-accent-grad text-white" : "bg-white/8 text-white/40 line-through")
                }
              >
                {ad.isActive ? "表示中" : "停止中"}
              </button>
              <button
                onClick={async () => {
                  if (confirm("この広告を削除します。よろしいですか？")) {
                    await deleteAd(ad.id);
                    onChange();
                  }
                }}
                className="rounded-full border border-red-400/40 px-2.5 py-1 text-[11px] font-bold text-red-300"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
