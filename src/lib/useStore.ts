"use client";

import { useEffect, useState } from "react";
import { subscribe } from "./store";

/**
 * store の変更に追従する汎用フック。
 * SSR/初回ハイドレーション時は localStorage が無いので、
 * マウント後に getter を呼んで値を確定させる（hydration mismatch 回避）。
 */
export function useStoreValue<T>(getter: () => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    setValue(getter());
    const unsub = subscribe(() => setValue(getter()));
    return unsub;
    // getter は呼び出し側で安定している前提（毎回同じ関数参照）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
