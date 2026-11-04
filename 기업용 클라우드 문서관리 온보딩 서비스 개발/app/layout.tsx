import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "jihodev · 고객 온보딩 에이전트",
  description: "고객의 첫 성공을 돕는 근거 기반 온보딩 워크스페이스. 가상 고객·제품 데이터를 사용하는 포트폴리오입니다.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
