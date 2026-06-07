"use client";

import { useState } from "react";
import PageShell from "@/components/PageShell";
import { Field, SubmitButton, SuccessNote, TextArea, TextInput } from "@/components/form";
import { addTakedownRequest } from "@/lib/store";
import { TAKEDOWN_TYPES, type TakedownType } from "@/lib/types";

export default function TakedownPage() {
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<{
    tiktokUrl: string;
    type: TakedownType;
    reason: string;
    contact: string;
  }>({
    tiktokUrl: "",
    type: "stop",
    reason: "",
    contact: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addTakedownRequest(form);
    setDone(true);
  };

  return (
    <PageShell title="掲載停止・修正依頼">
      {done ? (
        <SuccessNote>
          ご依頼を受け付けました。
          <br />
          内容を確認のうえ、対応いたします。
        </SuccessNote>
      ) : (
        <>
          <p className="mb-6 text-sm leading-relaxed text-white/70">
            掲載中のTikTok動画について、掲載停止・情報修正・店舗リンク削除などのご依頼を受け付けています。
          </p>

          <form onSubmit={submit} className="flex flex-col gap-5">
            <Field label="対象のTikTok動画URL" required>
              <TextInput
                type="url"
                required
                placeholder="https://www.tiktok.com/@.../video/..."
                value={form.tiktokUrl}
                onChange={(e) => setForm((f) => ({ ...f, tiktokUrl: e.target.value }))}
              />
            </Field>

            <Field label="依頼内容" required>
              <div className="flex flex-col gap-2">
                {TAKEDOWN_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-ink-700/60 px-4 py-3 text-sm text-white/90"
                  >
                    <input
                      type="radio"
                      name="type"
                      checked={form.type === t.value}
                      onChange={() => setForm((f) => ({ ...f, type: t.value }))}
                      className="h-4 w-4 accent-neon-pink"
                    />
                    {t.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="理由" required>
              <TextArea
                required
                placeholder="ご依頼の理由をご記入ください"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </Field>

            <Field label="連絡先" required hint="ご本人・店舗確認のため">
              <TextInput
                required
                placeholder="例）example@mail.com / @account"
                value={form.contact}
                onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              />
            </Field>

            <SubmitButton>依頼を送る</SubmitButton>
          </form>
        </>
      )}
    </PageShell>
  );
}
