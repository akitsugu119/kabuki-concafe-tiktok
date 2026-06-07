"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseField =
  "w-full rounded-xl border border-white/15 bg-ink-700 px-4 py-3 text-sm text-white placeholder-white/35 outline-none focus:border-neon-purple focus:ring-2 focus:ring-neon-purple/30";

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-white/90">
        {label}
        {required && <span className="ml-1 text-neon-pink">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/45">{hint}</span>}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={baseField} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={baseField + " min-h-[110px] resize-y"} />;
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-white/90">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-neon-pink"
      />
      {label}
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button type="submit" className="btn-accent w-full py-3.5 text-base">
      {children}
    </button>
  );
}

export function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neon-purple/40 bg-ink-700 p-6 text-center">
      <div className="mb-2 text-2xl">🌙</div>
      <p className="text-sm leading-relaxed text-white/90">{children}</p>
    </div>
  );
}
