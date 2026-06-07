import AppMenu from "@/components/AppMenu";
import IntroOverlay from "@/components/IntroOverlay";
import VideoFeed from "@/components/VideoFeed";

export default function HomePage() {
  return (
    <main className="relative h-[100dvh] overflow-hidden bg-ink-900">
      {/* 左上：控えめなアプリ名（1行表示・フィルターの下に配置して重なりを回避） */}
      <div className="pointer-events-none fixed left-3 top-[calc(env(safe-area-inset-top)+50px)] z-20">
        <span className="whitespace-nowrap text-[10px] font-bold leading-none text-white/55">
          かぶき<span className="text-neon-rose/80">コンカフェ嬢</span>TikTokまとめ
        </span>
      </div>

      <AppMenu />
      <IntroOverlay />
      <VideoFeed />
    </main>
  );
}
