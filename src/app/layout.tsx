import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "かぶきコンカフェ嬢TikTokまとめ",
  description:
    "歌舞伎町コンカフェ嬢のTikTokを、スワイプでまとめ見。気になるコンカフェ嬢を、動画で見つける。",
};

export const viewport: Viewport = {
  themeColor: "#0a0710",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
