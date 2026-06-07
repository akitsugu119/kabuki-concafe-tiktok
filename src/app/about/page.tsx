import Link from "next/link";
import PageShell from "@/components/PageShell";

export default function AboutPage() {
  return (
    <PageShell title="このサイトについて">
      <div className="space-y-5 text-sm leading-relaxed text-white/80">
        <p>
          「かぶきコンカフェ嬢TikTokまとめ」は、歌舞伎町のコンカフェ嬢たちのTikTok動画を、
          スマホで縦スワイプしながら気軽に見られるまとめサイトです。
        </p>

        <section className="rounded-2xl border border-white/10 bg-ink-700/50 p-5">
          <h2 className="mb-2 text-sm font-bold text-white">大切にしていること</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-white/75">
            <li>店舗やキャストをランキング化するサイトではありません。</li>
            <li>容姿を評価するサイトでもありません。</li>
            <li>動画はTikTok公式埋め込みで表示し、動画ファイルを保存しません。</li>
            <li>気になったら、TikTok本家や一部の店舗公式リンクへ移動できます。</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-white">掲載・停止について</h2>
          <p className="text-white/75">
            掲載のご依頼、または掲載停止・情報修正・店舗リンク削除のご依頼は、以下のページから受け付けています。
            ご本人・店舗からのご依頼には速やかに対応いたします。
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/request" className="btn-ghost w-full">
              掲載依頼ページへ
            </Link>
            <Link href="/takedown" className="btn-accent w-full">
              掲載停止・修正依頼ページへ
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
