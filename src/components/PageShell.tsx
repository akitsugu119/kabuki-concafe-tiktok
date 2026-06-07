import Link from "next/link";

/**
 * サブページ共通レイアウト（掲載依頼・掲載停止/修正依頼・About など）。
 * 公開トップほど可愛くしすぎず、読みやすさ重視。
 */
export default function PageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-ink-900">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-ink-900/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="トップへ戻る"
          >
            ←
          </Link>
          <h1 className="text-base font-bold text-white">{title}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">{children}</div>
    </main>
  );
}
