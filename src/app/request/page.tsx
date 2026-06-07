"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import {
  Checkbox,
  Field,
  SubmitButton,
  SuccessNote,
  TextArea,
  TextInput,
} from "@/components/form";
import { addPublishRequest } from "@/lib/store";

export default function RequestPage() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    tiktokUrl: "",
    shopName: "",
    shopOfficialUrl: "",
    contact: "",
    wantPickup: false,
    message: "",
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addPublishRequest(form);
    setDone(true);
  };

  return (
    <PageShell title="掲載依頼">
      {done ? (
        <SuccessNote>
          掲載依頼を受け付けました。
          <br />
          内容を確認のうえ、必要に応じてご連絡いたします。
        </SuccessNote>
      ) : (
        <>
          <p className="mb-6 text-sm leading-relaxed text-white/70">
            かぶきコンカフェ嬢TikTokまとめでは、歌舞伎町コンカフェ嬢のTikTok動画の掲載依頼を受け付けています。
            動画はTikTok公式埋め込みで表示し、動画ファイルを自サイトに保存することはありません。
          </p>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <Field label="TikTok動画URL" required>
              <TextInput
                type="url"
                required
                placeholder="https://www.tiktok.com/@.../video/..."
                value={form.tiktokUrl}
                onChange={(e) => set("tiktokUrl", e.target.value)}
              />
            </Field>

            <Field label="店舗名">
              <TextInput
                placeholder="例）Cafe ゆめずく"
                value={form.shopName}
                onChange={(e) => set("shopName", e.target.value)}
              />
            </Field>

            <Field label="店舗公式URL">
              <TextInput
                type="url"
                placeholder="https://..."
                value={form.shopOfficialUrl}
                onChange={(e) => set("shopOfficialUrl", e.target.value)}
              />
            </Field>

            <Field label="連絡先" required hint="メール・X・LINEなど">
              <TextInput
                required
                placeholder="例）example@mail.com / @account"
                value={form.contact}
                onChange={(e) => set("contact", e.target.value)}
              />
            </Field>

            <div className="rounded-xl border border-white/10 bg-ink-700/60 p-4">
              <Checkbox
                label="「今注目」枠の希望あり"
                checked={form.wantPickup}
                onChange={(v) => set("wantPickup", v)}
              />
            </div>

            <Field label="メッセージ">
              <TextArea
                placeholder="ご要望などあればご記入ください"
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
              />
            </Field>

            <SubmitButton>掲載依頼を送る</SubmitButton>
          </form>
        </>
      )}
    </PageShell>
  );
}
