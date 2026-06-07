"use client";

import { FILTERS, type FeedFilter } from "@/lib/types";

interface Props {
  value: FeedFilter;
  onChange: (f: FeedFilter) => void;
}

/**
 * 上部フィルター（STEP 6）。
 * 透け感のある黒背景・選択中はピンク/紫グラデ。動画の邪魔にならない小さめUI。
 */
export default function FilterBar({ value, onChange }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div className="pointer-events-auto flex gap-1 rounded-full border border-white/10 bg-black/40 p-1 backdrop-blur-md">
        {FILTERS.map((f) => {
          const active = f.value === value;
          return (
            <button
              key={f.value}
              onClick={() => onChange(f.value)}
              className={
                "rounded-full px-3.5 py-1.5 text-xs font-bold transition " +
                (active
                  ? "bg-accent-grad text-white shadow-neon-soft"
                  : "text-white/70 hover:text-white")
              }
              aria-pressed={active}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { FeedFilter };
